import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import type { AuctionOtpChannel } from '../auction.types';
import { AuctionOtpDelivery } from './auction-otp-delivery.service';
import { BidderAuthService } from './bidder-auth.service';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_VERIFY_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_PER_DESTINATION_10_MIN = 3;
export const OTP_MAX_PER_DESTINATION_DAY = 10;
export const OTP_MAX_PER_IP_HOUR = 20;
/** Platform-wide SMS ceiling per hour (toll-fraud backstop); override with AUCTION_OTP_SMS_HOURLY_CAP. */
export const OTP_DEFAULT_GLOBAL_SMS_PER_HOUR = 500;

export type OtpIssueResult =
  | { sent: true; delivered: boolean }
  | { sent: false; limited: 'cooldown' | 'destination' | 'global' };

export type OtpVerifyResult = 'ok' | 'invalid' | 'expired' | 'locked';

interface OtpRow {
  id: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

@Injectable()
export class BidderOtpService {
  private readonly logger = new Logger(BidderOtpService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: BidderAuthService,
    private readonly delivery: AuctionOtpDelivery,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  hashCode(
    bidderId: string,
    channel: AuctionOtpChannel,
    destination: string,
    code: string,
  ): string {
    return this.auth.hmacHex(
      'otp',
      `${bidderId}|${channel}|${destination}|${code}`,
    );
  }

  private async countSince(
    column: 'destination' | 'ip_hash' | 'channel',
    value: string,
    windowMs: number,
  ): Promise<number> {
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await this.db
      .from('auction_otps')
      .select('id', { count: 'exact', head: true })
      .eq(column, value)
      .gte('created_at', since);
    if (error) {
      this.logger.error(`OTP limit query failed: ${error.message}`);
      throw new ServiceUnavailableException('Please try again shortly.');
    }
    return count ?? 0;
  }

  /** True when this IP hash already requested its hourly quota of codes (counted in the database). */
  async isIpLimited(ipHash: string): Promise<boolean> {
    return (
      (await this.countSince('ip_hash', ipHash, 60 * 60 * 1000)) >=
      OTP_MAX_PER_IP_HOUR
    );
  }

  private globalSmsCap(): number {
    const parsed = Number.parseInt(
      process.env.AUCTION_OTP_SMS_HOURLY_CAP ?? '',
      10,
    );
    return Number.isInteger(parsed) && parsed > 0
      ? parsed
      : OTP_DEFAULT_GLOBAL_SMS_PER_HOUR;
  }

  /** Creates and delivers a fresh code, superseding any earlier unused code for this bidder and channel. */
  async issue(params: {
    bidderId: string;
    channel: AuctionOtpChannel;
    destination: string;
    ipHash: string | null;
    auctionTitle?: string;
  }): Promise<OtpIssueResult> {
    const { bidderId, channel, destination, ipHash } = params;

    const { data: latest, error: latestError } = await this.db
      .from('auction_otps')
      .select('created_at')
      .eq('bidder_id', bidderId)
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) {
      this.logger.error(`OTP cooldown query failed: ${latestError.message}`);
      throw new ServiceUnavailableException('Please try again shortly.');
    }
    if (
      latest &&
      Date.now() - new Date(latest.created_at).getTime() <
        OTP_RESEND_COOLDOWN_MS
    ) {
      return { sent: false, limited: 'cooldown' };
    }

    if (
      (await this.countSince('destination', destination, 10 * 60 * 1000)) >=
        OTP_MAX_PER_DESTINATION_10_MIN ||
      (await this.countSince(
        'destination',
        destination,
        24 * 60 * 60 * 1000,
      )) >= OTP_MAX_PER_DESTINATION_DAY
    ) {
      return { sent: false, limited: 'destination' };
    }

    if (
      channel === 'sms' &&
      (await this.countSince('channel', 'sms', 60 * 60 * 1000)) >=
        this.globalSmsCap()
    ) {
      return { sent: false, limited: 'global' };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const nowIso = new Date().toISOString();

    const { error: supersedeError } = await this.db
      .from('auction_otps')
      .update({ expires_at: nowIso })
      .eq('bidder_id', bidderId)
      .eq('channel', channel)
      .is('consumed_at', null)
      .gt('expires_at', nowIso);
    if (supersedeError) {
      this.logger.error(`OTP supersede failed: ${supersedeError.message}`);
      throw new ServiceUnavailableException('Please try again shortly.');
    }

    const { error: insertError } = await this.db.from('auction_otps').insert({
      bidder_id: bidderId,
      channel,
      destination,
      code_hash: this.hashCode(bidderId, channel, destination, code),
      expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
      ip_hash: ipHash,
    });
    if (insertError) {
      this.logger.error(`OTP insert failed: ${insertError.message}`);
      throw new ServiceUnavailableException('Please try again shortly.');
    }

    const delivered = await this.delivery.send(channel, destination, code, {
      bidderId,
      auctionTitle: params.auctionTitle,
    });
    return { sent: true, delivered };
  }

  private async latestRow(
    bidderId: string,
    channel: AuctionOtpChannel,
  ): Promise<OtpRow | null> {
    const { data, error } = await this.db
      .from('auction_otps')
      .select('id, code_hash, attempts, expires_at, consumed_at, created_at')
      .eq('bidder_id', bidderId)
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      this.logger.error(`OTP lookup failed: ${error.message}`);
      throw new ServiceUnavailableException('Please try again shortly.');
    }
    return (data as OtpRow | null) ?? null;
  }

  /** Whether the newest code for this bidder and channel was successfully used. */
  async isLatestConsumed(
    bidderId: string,
    channel: AuctionOtpChannel,
  ): Promise<boolean> {
    const row = await this.latestRow(bidderId, channel);
    return row?.consumed_at != null;
  }

  async verify(params: {
    bidderId: string;
    channel: AuctionOtpChannel;
    destination: string;
    code: string;
  }): Promise<OtpVerifyResult> {
    const { bidderId, channel, destination, code } = params;

    // Every comparison is preceded by a compare-and-set attempts increment, so
    // concurrent guesses cannot exceed the attempt limit.
    for (let tries = 0; tries < 3; tries++) {
      const row = await this.latestRow(bidderId, channel);
      if (!row || row.consumed_at) return 'invalid';
      if (new Date(row.expires_at).getTime() <= Date.now()) return 'expired';
      if (row.attempts >= OTP_MAX_VERIFY_ATTEMPTS) return 'locked';

      const { data: claimed, error } = await this.db
        .from('auction_otps')
        .update({ attempts: row.attempts + 1 })
        .eq('id', row.id)
        .eq('attempts', row.attempts)
        .is('consumed_at', null)
        .select('id');
      if (error) {
        this.logger.error(`OTP attempt update failed: ${error.message}`);
        throw new ServiceUnavailableException('Please try again shortly.');
      }
      if (!claimed || claimed.length === 0) continue;

      const expected = Buffer.from(
        this.hashCode(bidderId, channel, destination, code),
        'hex',
      );
      const stored = Buffer.from(row.code_hash, 'hex');
      const matches =
        expected.length === stored.length && timingSafeEqual(expected, stored);

      if (!matches) {
        if (row.attempts + 1 >= OTP_MAX_VERIFY_ATTEMPTS) {
          await this.invalidate(row.id);
          return 'locked';
        }
        return 'invalid';
      }

      const { data: consumed, error: consumeError } = await this.db
        .from('auction_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', row.id)
        .is('consumed_at', null)
        .select('id');
      if (consumeError) {
        this.logger.error(`OTP consume failed: ${consumeError.message}`);
        throw new ServiceUnavailableException('Please try again shortly.');
      }
      return consumed && consumed.length > 0 ? 'ok' : 'invalid';
    }
    return 'invalid';
  }

  /** Expires (never "consumes") a code, so consumed_at always means a successful verification. */
  private async invalidate(id: string): Promise<void> {
    const { error } = await this.db
      .from('auction_otps')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', id);
    if (error) this.logger.error(`OTP invalidate failed: ${error.message}`);
  }
}
