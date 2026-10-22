import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { storeAuctionImage } from '../admin/auction-image';
import type { MulterFile } from '../admin/auction-image';
import { SupabaseService } from '../../supabase/supabase.service';
import { areDonationsOpen } from '../auction-phase';
import { AuctionPublicService } from './auction-public.service';
import { BidderAuthService } from './bidder-auth.service';
import { codedError } from './bidding-errors';
import {
  isHoneypotTripped,
  parseDonationSubmit,
  parseDonorOtpStart,
  parseDonorVerify,
} from './dto/donation.dto';
import { DonorAuthService } from './donor-auth.service';
import type { DonorTokenPayload } from './donor-auth.service';
import { DonorOtpService } from './donor-otp.service';

export const MAX_PENDING_DONATIONS_PER_PHONE = 5;
export const MAX_DONATIONS_PER_PHONE_DAY = 10;
export const MAX_DONATIONS_PER_IP_HOUR = 10;
export const MAX_DONOR_UPLOADS_PER_SESSION = 12;
const DONOR_UPLOAD_WINDOW_MS = 30 * 60 * 1000;
const IMAGE_BUCKET_PATH = '/storage/v1/object/public/auction-images/donations/';

const LIMIT_MESSAGES = {
  cooldown:
    'A code was sent recently. Wait a minute before asking for another.',
  destination:
    'Too many codes were requested for this number. Try again later.',
  ip: 'Too many verification requests. Try again later.',
  global: 'We are unable to send codes right now. Please try again later.',
} as const;

/** Donated photos must be ones this donation flow uploaded: https URLs in this auction's donation folder. */
export function isDonationImageUrl(value: string, auctionId: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:' || url.search || url.hash) return false;
  const configured = process.env.SUPABASE_URL;
  if (configured) {
    try {
      if (new URL(configured).host !== url.host) return false;
    } catch {
      return false;
    }
  }
  return (
    url.pathname.startsWith(`${IMAGE_BUCKET_PATH}${auctionId}/`) &&
    /\.webp$/.test(url.pathname)
  );
}

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

/** Public item-donation flow: SMS-verify the donor, then accept a pending donation while the auction is accepting donations. */
@Injectable()
export class AuctionDonationsService {
  private readonly logger = new Logger(AuctionDonationsService.name);
  private readonly uploads = new Map<string, number[]>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly publicAuctions: AuctionPublicService,
    private readonly otp: DonorOtpService,
    private readonly donorAuth: DonorAuthService,
    private readonly auth: BidderAuthService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private unavailable(what: string, message: string): never {
    this.logger.error(`${what}: ${message}`);
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  /** 404 unless the auction page is public; 409 unless it is currently accepting item donations. */
  private async requireAcceptingDonations(auctionId: string) {
    const auction = await this.publicAuctions.loadPublicAuction(auctionId);
    const open = areDonationsOpen({
      status: auction.status,
      accepts_donations: auction.accepts_donations,
      donations_close_at: auction.donations_close_at,
    });
    if (!open) {
      throw codedError(
        409,
        'donations_closed',
        'This auction is not accepting item donations right now.',
      );
    }
    return auction;
  }

  private requireDonor(
    request: RequestLike,
    auctionId: string,
  ): DonorTokenPayload {
    const donor = this.donorAuth.fromRequest(request, auctionId);
    if (!donor) {
      throw new UnauthorizedException(
        'Please verify your phone number to donate.',
      );
    }
    return donor;
  }

  async startOtp(auctionId: string, body: unknown, ip: string) {
    // Bots get the same answer as people; nothing is sent.
    if (isHoneypotTripped(body)) return { sent: true };
    const dto = parseDonorOtpStart(body);
    const auction = await this.requireAcceptingDonations(auctionId);
    const result = await this.otp.issue({
      auctionId,
      phone: dto.phone,
      ipHash: this.auth.hashIp(ip),
      auctionTitle: auction.title,
    });
    if (!result.sent) {
      throw codedError(429, 'rate_limited', LIMIT_MESSAGES[result.limited], {
        limited: result.limited,
        retry_after_seconds: result.limited === 'cooldown' ? 60 : 3600,
      });
    }
    // dev_code is only ever present when the local-testing bypass is on (never in production).
    return {
      sent: true,
      ...(result.devCode ? { dev_code: result.devCode } : {}),
    };
  }

  async verifyOtp(auctionId: string, body: unknown) {
    const dto = parseDonorVerify(body);
    await this.requireAcceptingDonations(auctionId);
    const result = await this.otp.verify({ auctionId, ...dto });
    if (result !== 'ok') {
      throw new UnauthorizedException(
        'That code is invalid or has expired. Request a new code if needed.',
      );
    }
    const { token, expiresInSeconds } = this.donorAuth.signToken(
      auctionId,
      dto.phone,
    );
    return { donorToken: token, expiresInSeconds };
  }

  private async countDonations(
    auctionId: string,
    filter: (q: any) => any,
  ): Promise<number> {
    const query = this.db
      .from('auction_donations')
      .select('id', { count: 'exact', head: true })
      .eq('auction_id', auctionId);
    const { count, error } = await filter(query);
    if (error) this.unavailable('Donation count failed', error.message);
    return (count as number | null) ?? 0;
  }

  async submit(
    auctionId: string,
    body: unknown,
    request: RequestLike,
    ip: string,
  ) {
    const donor = this.requireDonor(request, auctionId);
    // Silent success for bots: nothing is stored.
    if (isHoneypotTripped(body)) return { id: randomUUID(), status: 'pending' };

    const auction = await this.requireAcceptingDonations(auctionId);
    const dto = parseDonationSubmit(body);
    if (!this.donorAuth.isTokenPhone(donor, auctionId, dto.donor_phone)) {
      throw codedError(
        403,
        'phone_mismatch',
        'The phone number must match the one you verified.',
      );
    }
    if (!dto.image_urls.every((url) => isDonationImageUrl(url, auctionId))) {
      throw new BadRequestException(
        'Photos must be uploaded through this form.',
      );
    }

    const ipHash = this.auth.hashIp(ip);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    if (
      (await this.countDonations(auctionId, (q) =>
        q.eq('donor_phone', dto.donor_phone).eq('status', 'pending'),
      )) >= MAX_PENDING_DONATIONS_PER_PHONE
    ) {
      throw codedError(
        429,
        'too_many_pending',
        'You have several donations waiting for review. Please wait until the organizer reviews them.',
        { retry_after_seconds: 3600 },
      );
    }
    if (
      (await this.countDonations(auctionId, (q) =>
        q.eq('donor_phone', dto.donor_phone).gte('created_at', dayAgo),
      )) >= MAX_DONATIONS_PER_PHONE_DAY ||
      (await this.countDonations(auctionId, (q) =>
        q.eq('ip_hash', ipHash).gte('created_at', hourAgo),
      )) >= MAX_DONATIONS_PER_IP_HOUR
    ) {
      throw codedError(
        429,
        'rate_limited',
        'Too many donations submitted. Try again later.',
        { retry_after_seconds: 3600 },
      );
    }

    const { data, error } = await this.db
      .from('auction_donations')
      .insert({
        auction_id: auctionId,
        organization_id: auction.organization_id ?? null,
        donor_name: dto.donor_name,
        donor_business: dto.donor_business,
        donor_email: dto.donor_email,
        donor_phone: dto.donor_phone,
        phone_verified_at: new Date().toISOString(),
        title: dto.title,
        description: dto.description,
        category: dto.category,
        estimated_value_cents: dto.estimated_value_cents,
        image_urls: dto.image_urls,
        condition: dto.condition ?? null,
        specifications: dto.specifications ?? null,
        whats_included: dto.whats_included ?? null,
        restrictions: dto.restrictions ?? null,
        expires_on: dto.expires_on ?? null,
        fulfillment_method: dto.fulfillment_method,
        fulfillment_details: dto.fulfillment_details ?? null,
        is_experience: dto.is_experience ?? false,
        scheduling_requirements: dto.scheduling_requirements ?? null,
        blackout_dates: dto.blackout_dates ?? null,
        recognition_ok: dto.recognition_ok,
        status: 'pending',
        ip_hash: ipHash,
      })
      .select('id')
      .single();
    if (error || !data) {
      this.unavailable('Donation insert failed', error?.message ?? 'no row');
    }
    return { id: (data as { id: string }).id, status: 'pending' as const };
  }

  /** In-process cap on uploads per verified phone; each upload is also rate-limited per IP by the controller. */
  private checkUploadRate(key: string): void {
    const now = Date.now();
    const recent = (this.uploads.get(key) ?? []).filter(
      (t) => now - t < DONOR_UPLOAD_WINDOW_MS,
    );
    if (recent.length >= MAX_DONOR_UPLOADS_PER_SESSION) {
      this.uploads.set(key, recent);
      throw codedError(
        429,
        'rate_limited',
        'Too many photos uploaded. Try again later.',
        {
          retry_after_seconds: 600,
        },
      );
    }
    recent.push(now);
    this.uploads.set(key, recent);
    if (this.uploads.size > 5000) {
      for (const [k, times] of this.uploads) {
        if (!times.some((t) => now - t < DONOR_UPLOAD_WINDOW_MS)) {
          this.uploads.delete(k);
        }
      }
    }
  }

  async uploadImage(
    auctionId: string,
    file: MulterFile | undefined,
    request: RequestLike,
  ) {
    const donor = this.requireDonor(request, auctionId);
    await this.requireAcceptingDonations(auctionId);
    this.checkUploadRate(donor.phone_hash);
    const url = await storeAuctionImage(
      this.supabase,
      file,
      `donations/${auctionId}`,
    );
    return { url };
  }
}
