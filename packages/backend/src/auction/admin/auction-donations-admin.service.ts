import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { AuctionItemRow } from '../auction.types';
import { AuctionAdminService } from './auction-admin.service';
import {
  parseApprove,
  parseDecline,
  parseDonationEdit,
  parseDonationStatus,
} from './dto/org-input';

/** Everything the organizer may see about a donation; the submitter's IP hash stays server-side. */
export const ORGANIZER_DONATION_COLUMNS =
  'id, auction_id, organization_id, donor_name, donor_business, donor_email, donor_phone, phone_verified_at, title, description, category, estimated_value_cents, image_urls, condition, specifications, whats_included, restrictions, expires_on, fulfillment_method, fulfillment_details, is_experience, scheduling_requirements, blackout_dates, recognition_ok, status, decline_reason, reviewed_at, item_id, created_at, updated_at';

export interface DonationRow {
  id: string;
  auction_id: string;
  donor_name: string;
  donor_business: string | null;
  title: string;
  description: string | null;
  category: string | null;
  estimated_value_cents: number | null;
  image_urls: string[] | null;
  recognition_ok: boolean;
  status: 'pending' | 'approved' | 'declined';
  item_id: string | null;
  [key: string]: unknown;
}

/** Organizer review of donated items. Every lookup is scoped to the caller's promoter account via the donation's auction. */
@Injectable()
export class AuctionDonationsAdminService {
  private readonly logger = new Logger(AuctionDonationsAdminService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly admin: AuctionAdminService,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private fail(op: string, error: { code?: string }): never {
    this.logger.error(`${op} failed (${error.code ?? 'db_error'})`);
    throw new InternalServerErrorException('Could not save the change.');
  }

  private async owned(userId: string, donationId: string) {
    const promoter = await this.admin.getPromoterAccount(userId);
    const { data, error } = await this.db
      .from('auction_donations')
      .select(ORGANIZER_DONATION_COLUMNS)
      .eq('id', donationId)
      .maybeSingle();
    if (error) this.fail('donation lookup', error);
    if (!data) throw new NotFoundException('Donation not found');
    const donation = data as unknown as DonationRow;
    const auction = await this.admin.getOwnedAuction(
      promoter.id,
      donation.auction_id,
    );
    return { donation, auction };
  }

  private async audit(
    auctionId: string,
    userId: string,
    action: string,
    donationId: string,
    details: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await this.db.from('auction_audit').insert({
      auction_id: auctionId,
      actor_type: 'promoter',
      actor_id: userId,
      action,
      entity_type: 'donation',
      entity_id: donationId,
      details,
    });
    if (error) this.logger.error(`audit ${action} failed (${error.code})`);
  }

  async list(userId: string, auctionId: string, status: unknown) {
    const filter = parseDonationStatus(status);
    const promoter = await this.admin.getPromoterAccount(userId);
    const auction = await this.admin.getOwnedAuction(promoter.id, auctionId);
    let query = this.db
      .from('auction_donations')
      .select(ORGANIZER_DONATION_COLUMNS)
      .eq('auction_id', auction.id);
    if (filter) query = query.eq('status', filter);
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) this.fail('list donations', error);
    return data ?? [];
  }

  async update(userId: string, donationId: string, dto: unknown) {
    const { donation } = await this.owned(userId, donationId);
    const patch = parseDonationEdit(dto);
    if (donation.status !== 'pending') {
      throw new BadRequestException(
        `A ${donation.status} donation can no longer be edited.`,
      );
    }
    if (!Object.keys(patch).length) return donation;
    const { data, error } = await this.db
      .from('auction_donations')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', donation.id)
      .eq('status', 'pending')
      .select(ORGANIZER_DONATION_COLUMNS)
      .maybeSingle();
    if (error) this.fail('update donation', error);
    if (!data) {
      throw new ConflictException(
        'The donation changed; reload and try again.',
      );
    }
    return data;
  }

  async decline(userId: string, donationId: string, dto: unknown) {
    const { reason } = parseDecline(dto);
    const { donation, auction } = await this.owned(userId, donationId);
    if (donation.status !== 'pending') {
      throw new BadRequestException(
        `This donation was already ${donation.status}.`,
      );
    }
    const now = new Date().toISOString();
    const { data, error } = await this.db
      .from('auction_donations')
      .update({
        status: 'declined',
        decline_reason: reason,
        reviewed_by_user_id: userId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', donation.id)
      .eq('status', 'pending')
      .select(ORGANIZER_DONATION_COLUMNS)
      .maybeSingle();
    if (error) this.fail('decline donation', error);
    if (!data) {
      throw new ConflictException(
        'The donation changed; reload and try again.',
      );
    }
    await this.audit(auction.id, userId, 'donation_declined', donation.id);
    // TODO: notify the donor by SMS (reuse the auction outbox) once a donor-facing template exists.
    return data;
  }

  /**
   * Claims the donation first (pending -> approved) so concurrent approvals cannot both create an item,
   * then creates the item through the normal item path; a failure there releases the claim.
   */
  async approve(userId: string, donationId: string, dto: unknown) {
    const input = parseApprove(dto);
    const { donation, auction } = await this.owned(userId, donationId);
    if (donation.status !== 'pending') {
      throw new BadRequestException(
        `This donation was already ${donation.status}.`,
      );
    }

    const now = new Date().toISOString();
    const { data: claimed, error: claimError } = await this.db
      .from('auction_donations')
      .update({
        status: 'approved',
        decline_reason: null,
        reviewed_by_user_id: userId,
        reviewed_at: now,
        updated_at: now,
      })
      .eq('id', donation.id)
      .eq('status', 'pending')
      .select(ORGANIZER_DONATION_COLUMNS)
      .maybeSingle();
    if (claimError) this.fail('approve donation', claimError);
    if (!claimed) {
      throw new ConflictException(
        'The donation changed; reload and try again.',
      );
    }
    const row = claimed as unknown as DonationRow;

    let item: AuctionItemRow;
    try {
      item = await this.admin.createItem(
        userId,
        auction.id,
        {
          sale_mode: 'auction',
          title: row.title,
          description: row.description,
          category:
            input.category !== undefined ? input.category : row.category,
          donor_name: row.donor_name,
          donor_business: row.donor_business,
          donor_recognition: row.recognition_ok === true,
          image_urls: row.image_urls ?? [],
          fair_market_value_cents: row.estimated_value_cents ?? 0,
          starting_bid_cents: input.starting_bid_cents,
          increment_cents: input.increment_cents,
          reserve_cents: input.reserve_cents,
          buy_now_cents: input.buy_now_cents,
          lot_number: input.lot_number,
          condition: row.condition,
          specifications: row.specifications,
          whats_included: row.whats_included,
          restrictions: row.restrictions,
          expires_on: row.expires_on,
          fulfillment_method: row.fulfillment_method,
          fulfillment_details: row.fulfillment_details,
          is_experience: row.is_experience,
          scheduling_requirements: row.scheduling_requirements,
          blackout_dates: row.blackout_dates,
        },
        { source_donation_id: donation.id },
      );
    } catch (err) {
      await this.releaseClaim(donation.id);
      throw err;
    }

    const { data: linked, error: linkError } = await this.db
      .from('auction_donations')
      .update({ item_id: item.id, updated_at: new Date().toISOString() })
      .eq('id', donation.id)
      .select(ORGANIZER_DONATION_COLUMNS)
      .maybeSingle();
    if (linkError) {
      this.logger.error(`link donation to item failed (${linkError.code})`);
    }
    await this.audit(auction.id, userId, 'donation_approved', donation.id, {
      item_id: item.id,
    });
    // TODO: notify the donor by SMS (reuse the auction outbox) once a donor-facing template exists.
    return { donation: linked ?? { ...row, item_id: item.id }, item };
  }

  private async releaseClaim(donationId: string): Promise<void> {
    const { error } = await this.db
      .from('auction_donations')
      .update({
        status: 'pending',
        reviewed_by_user_id: null,
        reviewed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', donationId)
      .eq('status', 'approved')
      .is('item_id', null);
    if (error) {
      this.logger.error(`release donation claim failed (${error.code})`);
    }
  }
}
