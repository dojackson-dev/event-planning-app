import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomInt, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuctionOtpDelivery } from './auction-otp-delivery.service';
import { donorDevOtpBypassEnabled } from './donor-dev-bypass';
import { BidderAuthService } from './bidder-auth.service';
import {
  OTP_DEFAULT_GLOBAL_SMS_PER_HOUR,
  OTP_MAX_PER_DESTINATION_10_MIN,
  OTP_MAX_PER_DESTINATION_DAY,
  OTP_MAX_PER_IP_HOUR,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
} from './bidder-otp.service';
import type { OtpVerifyResult } from './bidder-otp.service';

export type DonorOtpIssueResult =
  | { sent: true; delivered: boolean; devCode?: string }
  | { sent: false; limited: 'cooldown' | 'destination' | 'ip' | 'global' };

interface DonorOtpRow {
  id: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
}

/** SMS one-time codes for item donors; mirrors BidderOtpService against auction_donor_otps. */
@Injectable()
export class DonorOtpService {
  private readonly logger = new Logger(DonorOtpService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: BidderAuthService,
    private readonly delivery: AuctionOtpDelivery,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private unavailable(what: string, message: string): never {
    this.logger.error(`${what}: ${message}`);
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  hashCode(auctionId: string, phone: string, code: string): string {
    return this.auth.hmacHex('otp', `donor|${auctionId}|${phone}|${code}`);
  }

  private async countSince(
    column: 'phone' | 'ip_hash',
    value: string,
    windowMs: number,
  ): Promise<number> {
    const since = new Date(Date.now() - windowMs).toISOString();
    const { count, error } = await this.db
      .from('auction_donor_otps')
      .select('id', { count: 'exact', head: true })
      .eq(column, value)
      .gte('created_at', since);
    if (error) this.unavailable('Donor OTP limit query failed', error.message);
    return count ?? 0;
  }

  /** Platform-wide SMS volume in the last hour, donors and bidders together (toll-fraud backstop). */
  private async globalSmsLastHour(): Promise<number> {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [donors, bidders] = await Promise.all([
      this.db
        .from('auction_donor_otps')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', since),
      this.db
        .from('auction_otps')
        .select('id', { count: 'exact', head: true })
        .eq('channel', 'sms')
        .gte('created_at', since),
    ]);
    if (donors.error)
      this.unavailable('Donor OTP cap query failed', donors.error.message);
    if (bidders.error)
      this.unavailable('Bidder OTP cap query failed', bidders.error.message);
    return (donors.count ?? 0) + (bidders.count ?? 0);
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

  async issue(params: {
    auctionId: string;
    phone: string;
    ipHash: string | null;
    auctionTitle?: string;
  }): Promise<DonorOtpIssueResult> {
    const { auctionId, phone, ipHash } = params;

    const { data: latest, error: latestError } = await this.db
      .from('auction_donor_otps')
      .select('created_at')
      .eq('auction_id', auctionId)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError)
      this.unavailable('Donor OTP cooldown query failed', latestError.message);
    if (
      latest &&
      Date.now() - new Date(latest.created_at).getTime() <
        OTP_RESEND_COOLDOWN_MS
    ) {
      return { sent: false, limited: 'cooldown' };
    }

    if (
      (await this.countSince('phone', phone, 10 * 60 * 1000)) >=
        OTP_MAX_PER_DESTINATION_10_MIN ||
      (await this.countSince('phone', phone, 24 * 60 * 60 * 1000)) >=
        OTP_MAX_PER_DESTINATION_DAY
    ) {
      return { sent: false, limited: 'destination' };
    }
    if (
      ipHash &&
      (await this.countSince('ip_hash', ipHash, 60 * 60 * 1000)) >=
        OTP_MAX_PER_IP_HOUR
    ) {
      return { sent: false, limited: 'ip' };
    }
    if ((await this.globalSmsLastHour()) >= this.globalSmsCap()) {
      return { sent: false, limited: 'global' };
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const nowIso = new Date().toISOString();

    const { error: supersedeError } = await this.db
      .from('auction_donor_otps')
      .update({ expires_at: nowIso })
      .eq('auction_id', auctionId)
      .eq('phone', phone)
      .is('consumed_at', null)
      .gt('expires_at', nowIso);
    if (supersedeError)
      this.unavailable('Donor OTP supersede failed', supersedeError.message);

    const { error: insertError } = await this.db
      .from('auction_donor_otps')
      .insert({
        auction_id: auctionId,
        phone,
        code_hash: this.hashCode(auctionId, phone, code),
        expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
        ip_hash: ipHash,
      });
    if (insertError)
      this.unavailable('Donor OTP insert failed', insertError.message);

    if (donorDevOtpBypassEnabled()) {
      // Local testing only (see donor-dev-bypass.ts): nothing is texted.
      this.logger.warn(
        `AUCTION_DEV_OTP_BYPASS is on: donor code for ${phone} is ${code} (no SMS sent)`,
      );
      return { sent: true, delivered: false, devCode: code };
    }

    const delivered = await this.delivery.send('sms', phone, code, {
      bidderId: `donor:${auctionId}`,
      auctionTitle: params.auctionTitle,
    });
    return { sent: true, delivered };
  }

  private async latestRow(
    auctionId: string,
    phone: string,
  ): Promise<DonorOtpRow | null> {
    const { data, error } = await this.db
      .from('auction_donor_otps')
      .select('id, code_hash, attempts, expires_at, consumed_at')
      .eq('auction_id', auctionId)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) this.unavailable('Donor OTP lookup failed', error.message);
    return (data as DonorOtpRow | null) ?? null;
  }

  async verify(params: {
    auctionId: string;
    phone: string;
    code: string;
  }): Promise<OtpVerifyResult> {
    const { auctionId, phone, code } = params;

    // Compare-and-set on `attempts` before every comparison, so concurrent guesses cannot exceed the limit.
    for (let tries = 0; tries < 3; tries++) {
      const row = await this.latestRow(auctionId, phone);
      if (!row || row.consumed_at) return 'invalid';
      if (new Date(row.expires_at).getTime() <= Date.now()) return 'expired';
      if (row.attempts >= OTP_MAX_VERIFY_ATTEMPTS) return 'locked';

      const { data: claimed, error } = await this.db
        .from('auction_donor_otps')
        .update({ attempts: row.attempts + 1 })
        .eq('id', row.id)
        .eq('attempts', row.attempts)
        .is('consumed_at', null)
        .select('id');
      if (error)
        this.unavailable('Donor OTP attempt update failed', error.message);
      if (!claimed || claimed.length === 0) continue;

      const expected = Buffer.from(
        this.hashCode(auctionId, phone, code),
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
        .from('auction_donor_otps')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', row.id)
        .is('consumed_at', null)
        .select('id');
      if (consumeError)
        this.unavailable('Donor OTP consume failed', consumeError.message);
      return consumed && consumed.length > 0 ? 'ok' : 'invalid';
    }
    return 'invalid';
  }

  private async invalidate(id: string): Promise<void> {
    const { error } = await this.db
      .from('auction_donor_otps')
      .update({ expires_at: new Date().toISOString() })
      .eq('id', id);
    if (error)
      this.logger.error(`Donor OTP invalidate failed: ${error.message}`);
  }
}
