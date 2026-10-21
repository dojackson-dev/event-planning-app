import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { AuctionOtpChannel } from '../auction.types';
import { AuctionPublicService } from './auction-public.service';
import { BidderAuthService } from './bidder-auth.service';
import { BidderOtpService } from './bidder-otp.service';
import type { OtpIssueResult } from './bidder-otp.service';
import { codedError, tooManyRequests } from './bidding-errors';
import {
  AUCTION_TERMS_VERSION,
  type RegisterStartDto,
  type ResendDto,
  type VerifyDto,
} from './dto/register.dto';

const BIDDER_COLUMNS =
  'id, auction_id, email, phone_e164, display_name, email_verified_at, phone_verified_at, blocked_at';
const MAX_REGISTRATION_ATTEMPTS = 6;

interface BidderRow {
  id: string;
  auction_id: string;
  email: string;
  phone_e164: string;
  display_name: string;
  email_verified_at: string | null;
  phone_verified_at: string | null;
  blocked_at: string | null;
}

export const RESEND_AFTER_SECONDS = 60;
const GENERIC_SENT = {
  ok: true,
  message: 'If those details match, a new code was sent.',
  resend_after_seconds: RESEND_AFTER_SECONDS,
};

function invalidCode() {
  return new UnauthorizedException(
    'That code is invalid or has expired. Request a new code if needed.',
  );
}

@Injectable()
export class BidderRegistrationService {
  private readonly logger = new Logger(BidderRegistrationService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly auth: BidderAuthService,
    private readonly otp: BidderOtpService,
    private readonly publicAuctions: AuctionPublicService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private unavailable(what: string, message: string): never {
    this.logger.error(`${what}: ${message}`);
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  private async findByEmail(
    auctionId: string,
    email: string,
  ): Promise<BidderRow | null> {
    const { data, error } = await this.db
      .from('auction_bidders')
      .select(BIDDER_COLUMNS)
      .eq('auction_id', auctionId)
      .eq('email', email)
      .maybeSingle();
    if (error) this.unavailable('Bidder lookup failed', error.message);
    return (data as BidderRow | null) ?? null;
  }

  private async findByPhone(
    auctionId: string,
    phone: string,
  ): Promise<BidderRow | null> {
    const { data, error } = await this.db
      .from('auction_bidders')
      .select(BIDDER_COLUMNS)
      .eq('auction_id', auctionId)
      .eq('phone_e164', phone)
      .maybeSingle();
    if (error) this.unavailable('Bidder lookup failed', error.message);
    return (data as BidderRow | null) ?? null;
  }

  private async nextPaddle(auctionId: string): Promise<number> {
    const { data, error } = await this.db
      .from('auction_bidders')
      .select('paddle_number')
      .eq('auction_id', auctionId)
      .not('paddle_number', 'is', null)
      .order('paddle_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) this.unavailable('Paddle lookup failed', error.message);
    return ((data as { paddle_number: number } | null)?.paddle_number ?? 0) + 1;
  }

  private conflict() {
    return codedError(
      409,
      'registration_unavailable',
      "Those contact details can't be used to register for this auction. Check them, or contact the organizer.",
    );
  }

  /** Reuse an exact email+phone match, create when neither exists, reject partial matches without saying which. */
  private async findOrCreateBidder(
    auctionId: string,
    dto: RegisterStartDto,
    ipHash: string,
  ): Promise<BidderRow> {
    const consent = {
      auth_terms_version: AUCTION_TERMS_VERSION,
      auth_accepted_at: new Date().toISOString(),
      auth_ip_hash: ipHash,
      sms_consent: dto.smsConsent,
    };

    for (let attempt = 0; attempt < MAX_REGISTRATION_ATTEMPTS; attempt++) {
      const [byEmail, byPhone] = await Promise.all([
        this.findByEmail(auctionId, dto.email),
        this.findByPhone(auctionId, dto.phone),
      ]);

      if (byEmail || byPhone) {
        if (!byEmail || !byPhone || byEmail.id !== byPhone.id) {
          throw this.conflict();
        }
        if (byEmail.blocked_at) throw this.conflict();
        // A verified bidder's name and consent record are never rewritten by an unauthenticated call.
        if (!byEmail.email_verified_at && !byEmail.phone_verified_at) {
          const { error } = await this.db
            .from('auction_bidders')
            .update({ display_name: dto.fullName, ...consent })
            .eq('id', byEmail.id);
          if (error) this.unavailable('Bidder update failed', error.message);
        }
        return byEmail;
      }

      const paddle = await this.nextPaddle(auctionId);
      const { data, error } = await this.db
        .from('auction_bidders')
        .insert({
          auction_id: auctionId,
          display_name: dto.fullName,
          email: dto.email,
          phone_e164: dto.phone,
          paddle_number: paddle,
          ...consent,
        })
        .select(BIDDER_COLUMNS)
        .single();
      if (!error && data) return data as BidderRow;
      // 23505: a concurrent registration took this paddle/email/phone; look up again and retry.
      if (error?.code !== '23505') {
        this.unavailable('Bidder insert failed', error?.message ?? 'no row');
      }
    }
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  private async assertIpAllowed(ipHash: string): Promise<void> {
    if (await this.otp.isIpLimited(ipHash)) {
      throw tooManyRequests(
        'Too many verification requests. Try again later.',
        3600,
      );
    }
  }

  async start(auctionId: string, dto: RegisterStartDto, ip: string) {
    const auction =
      await this.publicAuctions.requireRegistrableAuction(auctionId);
    const ipHash = this.auth.hashIp(ip);
    await this.assertIpAllowed(ipHash);

    const bidder = await this.findOrCreateBidder(auctionId, dto, ipHash);
    const common = { bidderId: bidder.id, ipHash, auctionTitle: auction.title };
    const email = await this.otp.issue({
      ...common,
      channel: 'email',
      destination: bidder.email,
    });
    const sms = await this.otp.issue({
      ...common,
      channel: 'sms',
      destination: bidder.phone_e164,
    });
    if (!email.sent && !sms.sent) {
      throw tooManyRequests(
        'A code was requested recently. Wait a minute before asking for another.',
      );
    }
    return {
      ok: true,
      sent: { email: email.sent, sms: sms.sent },
      expires_in_seconds: 600,
      resend_after_seconds: RESEND_AFTER_SECONDS,
    };
  }

  /** Both channels need a fresh code consumed after the latest send before a token is issued. */
  async verify(auctionId: string, dto: VerifyDto) {
    await this.publicAuctions.requireRegistrableAuction(auctionId);
    const bidder = await this.findByEmail(auctionId, dto.email);
    if (!bidder || bidder.blocked_at) throw invalidCode();

    const destination =
      dto.channel === 'email' ? bidder.email : bidder.phone_e164;
    const result = await this.otp.verify({
      bidderId: bidder.id,
      channel: dto.channel,
      destination,
      code: dto.code,
    });
    if (result !== 'ok') throw invalidCode();

    const now = new Date().toISOString();
    const column =
      dto.channel === 'email' ? 'email_verified_at' : 'phone_verified_at';
    const { error } = await this.db
      .from('auction_bidders')
      .update({ [column]: now, updated_at: now })
      .eq('id', bidder.id)
      .is(column, null);
    if (error) this.unavailable('Verification update failed', error.message);

    const emailVerified =
      dto.channel === 'email' || bidder.email_verified_at !== null;
    const phoneVerified =
      dto.channel === 'sms' || bidder.phone_verified_at !== null;
    const verified = { email: emailVerified, phone: phoneVerified };

    if (
      emailVerified &&
      phoneVerified &&
      (await this.otp.isLatestConsumed(bidder.id, 'email')) &&
      (await this.otp.isLatestConsumed(bidder.id, 'sms'))
    ) {
      const { token, expiresAt } = await this.auth.issueToken(
        bidder.id,
        auctionId,
      );
      return { verified, token, token_expires_at: expiresAt.toISOString() };
    }
    return { verified };
  }

  async resend(auctionId: string, dto: ResendDto, ip: string) {
    const auction =
      await this.publicAuctions.requireRegistrableAuction(auctionId);
    const ipHash = this.auth.hashIp(ip);
    await this.assertIpAllowed(ipHash);

    const bidder = await this.findByEmail(auctionId, dto.email);
    if (bidder && !bidder.blocked_at) {
      await this.issueQuietly(bidder, dto.channel, ipHash, auction.title);
    }
    return { ...GENERIC_SENT };
  }

  async loginStart(auctionId: string, email: string, ip: string) {
    // Returning bidders may log in after close (to see orders), so only public visibility is required.
    const auction = await this.publicAuctions.loadPublicAuction(auctionId);
    const ipHash = this.auth.hashIp(ip);
    await this.assertIpAllowed(ipHash);

    const bidder = await this.findByEmail(auctionId, email);
    if (
      bidder &&
      !bidder.blocked_at &&
      bidder.email_verified_at &&
      bidder.phone_verified_at
    ) {
      await this.issueQuietly(bidder, 'email', ipHash, auction.title);
    }
    return { ...GENERIC_SENT };
  }

  async loginVerify(auctionId: string, email: string, code: string) {
    await this.publicAuctions.loadPublicAuction(auctionId);
    const bidder = await this.findByEmail(auctionId, email);
    if (
      !bidder ||
      bidder.blocked_at ||
      !bidder.email_verified_at ||
      !bidder.phone_verified_at
    ) {
      throw invalidCode();
    }
    const result = await this.otp.verify({
      bidderId: bidder.id,
      channel: 'email',
      destination: bidder.email,
      code,
    });
    if (result !== 'ok') throw invalidCode();
    const { token, expiresAt } = await this.auth.issueToken(
      bidder.id,
      auctionId,
    );
    return { token, token_expires_at: expiresAt.toISOString() };
  }

  /** Per-destination limits are hidden from the caller so responses don't reveal whether an account exists. */
  private async issueQuietly(
    bidder: BidderRow,
    channel: AuctionOtpChannel,
    ipHash: string,
    auctionTitle: string,
  ): Promise<OtpIssueResult> {
    return this.otp.issue({
      bidderId: bidder.id,
      channel,
      destination: channel === 'email' ? bidder.email : bidder.phone_e164,
      ipHash,
      auctionTitle,
    });
  }
}
