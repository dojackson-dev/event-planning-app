import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { isVerifiedNonprofit } from '../../nonprofit/nonprofit-gate';
import {
  AUCTION_ORDER_CHARGER,
  type AuctionOrderCharger,
} from '../auction-ports';
import type {
  AuctionBidderRow,
  AuctionItemRow,
  AuctionOrderRow,
  AuctionOrderStatus,
  AuctionRow,
  AuctionStatus,
  ResolveReserveResult,
} from '../auction.types';
import {
  asObject,
  AuctionInput,
  HARD_CLOSE_MINUTES,
  ItemPatch,
  MAX_IMAGES_PER_DONATION,
  normalizeItemPatch,
  optionalText,
  parseAuctionInput,
  parseItemInput,
} from './dto/auction-input';

/** Outbox kind written when an item is withdrawn (not yet in AUCTION_OUTBOX_KINDS). */
export const ITEM_WITHDRAWN_OUTBOX_KIND = 'item_withdrawn';

export interface PromoterAccountRow {
  id: string;
  company_name: string | null;
  is_nonprofit: boolean | null;
  nonprofit_status: string | null;
  nonprofit_legal_name: string | null;
  nonprofit_ein: string | null;
  stripe_account_id: string | null;
  stripe_connect_status: string | null;
}

const HOUR_MS = 3_600_000;
const MAX_ITEMS_PER_AUCTION = 500;
const EDITABLE_AUCTION_STATUSES: AuctionStatus[] = [
  'draft',
  'scheduled',
  'live',
];
/** Orders that are unpaid and not mid-charge. */
const UNPAID_ORDER_STATUSES: AuctionOrderStatus[] = [
  'pending',
  'failed',
  'requires_action',
  'defaulted',
];
const RETRYABLE_ORDER_STATUSES: AuctionOrderStatus[] = [
  'failed',
  'requires_action',
];
/** An auction with orders in these states needs them cancelled or refunded first. */
const ACTIVE_ORDER_STATUSES: AuctionOrderStatus[] = [
  'pending',
  'charging',
  'requires_action',
  'failed',
  'paid',
];

const PROMOTER_COLUMNS =
  'id, company_name, is_nonprofit, nonprofit_status, nonprofit_legal_name, nonprofit_ein, stripe_account_id, stripe_connect_status';

const ms = (value: string | null | undefined): number =>
  value ? new Date(value).getTime() : NaN;

@Injectable()
export class AuctionAdminService {
  private readonly logger = new Logger(AuctionAdminService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @Optional()
    @Inject(AUCTION_ORDER_CHARGER)
    private readonly charger?: AuctionOrderCharger,
  ) {}

  // ─── helpers ─────────────────────────────────────────────────

  private get db() {
    return this.supabase.getAdminClient();
  }

  private fail(op: string, error: { code?: string }): never {
    this.logger.error(`${op} failed (${error.code ?? 'db_error'})`);
    if (error.code === '23514' || error.code === '23505') {
      throw new BadRequestException('That change breaks an auction rule.');
    }
    throw new InternalServerErrorException('Could not save the change.');
  }

  /** Audit failures are logged, not thrown: the mutation has already happened. */
  private async audit(
    auctionId: string | null,
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    details: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await this.db.from('auction_audit').insert({
      auction_id: auctionId,
      actor_type: 'promoter',
      actor_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
    if (error) this.logger.error(`audit ${action} failed (${error.code})`);
  }

  async getPromoterAccount(userId: string): Promise<PromoterAccountRow> {
    const { data } = await this.db
      .from('promoter_accounts')
      .select(PROMOTER_COLUMNS)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Promoter account not found');
    return data as unknown as PromoterAccountRow;
  }

  /** 404 (never 403) when the auction is missing or belongs to another promoter. */
  async getOwnedAuction(
    promoterId: string,
    auctionId: string,
  ): Promise<AuctionRow> {
    const { data } = await this.db
      .from('auctions')
      .select('*')
      .eq('id', auctionId)
      .eq('promoter_account_id', promoterId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Auction not found');
    return data as unknown as AuctionRow;
  }

  /** The caller's organization profile, if they have set one up (and the migration is applied). */
  private async getOrganizationId(promoterId: string): Promise<string | null> {
    const { data } = await this.db
      .from('auction_organizations')
      .select('id')
      .eq('promoter_account_id', promoterId)
      .maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  }

  /** Page fields need an organization; the slug is unique within it and required before the page goes public. */
  private async checkPageFields(
    organizationId: string | null,
    current: Pick<AuctionRow, 'id' | 'slug'> | null,
    input: AuctionInput,
  ): Promise<void> {
    if (input.slug) {
      if (!organizationId) {
        throw new BadRequestException(
          'Set up your organization page before choosing a web address.',
        );
      }
      const { data } = await this.db
        .from('auctions')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('slug', input.slug)
        .limit(2);
      const taken = ((data ?? []) as Array<{ id: string }>).some(
        (row) => row.id !== current?.id,
      );
      if (taken) {
        throw new ConflictException(
          'You already have an auction with that web address.',
        );
      }
    }
    if (input.page_published === true) {
      if (!organizationId) {
        throw new BadRequestException(
          'Set up your organization page before publishing an auction page.',
        );
      }
      const slug = input.slug !== undefined ? input.slug : current?.slug;
      if (!slug) {
        throw new BadRequestException(
          'Choose a web address (slug) before publishing the auction page.',
        );
      }
    }
  }

  private async getOwnedItem(promoterId: string, itemId: string) {
    const { data } = await this.db
      .from('auction_items')
      .select('*')
      .eq('id', itemId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Item not found');
    const item = data as unknown as AuctionItemRow;
    const auction = await this.getOwnedAuction(promoterId, item.auction_id);
    return { item, auction };
  }

  private async getOwnedOrder(
    promoterId: string,
    orderId: string,
  ): Promise<AuctionOrderRow> {
    const { data } = await this.db
      .from('auction_orders')
      .select('*')
      .eq('id', orderId)
      .eq('promoter_account_id', promoterId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Order not found');
    return data as unknown as AuctionOrderRow;
  }

  private async getOwnedBidder(promoterId: string, bidderId: string) {
    const { data } = await this.db
      .from('auction_bidders')
      .select('*')
      .eq('id', bidderId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Bidder not found');
    const bidder = data as unknown as AuctionBidderRow;
    const auction = await this.getOwnedAuction(promoterId, bidder.auction_id);
    return { bidder, auction };
  }

  private async eventSnapshot(promoterId: string, eventId: string | null) {
    if (!eventId) {
      return { public_event_id: null, event_title: null, event_date: null };
    }
    const { data } = await this.db
      .from('public_events')
      .select('id, title, event_date')
      .eq('id', eventId)
      .eq('promoter_account_id', promoterId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Event not found');
    const event = data as unknown as {
      id: string;
      title: string | null;
      event_date: string | null;
    };
    return {
      public_event_id: event.id,
      event_title: event.title ?? null,
      event_date: event.event_date ?? null,
    };
  }

  private assertAuctionOpenForItemChanges(auction: AuctionRow): void {
    if (!EDITABLE_AUCTION_STATUSES.includes(auction.status)) {
      throw new BadRequestException(
        `Items cannot be changed on a ${auction.status} auction.`,
      );
    }
    if (auction.status === 'live' && ms(auction.ends_at) <= Date.now()) {
      throw new BadRequestException('This auction has ended.');
    }
  }

  // ─── auctions ────────────────────────────────────────────────

  async listAuctions(userId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const { data, error } = await this.db
      .from('auctions')
      .select('*')
      .eq('promoter_account_id', promoter.id)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) this.fail('listAuctions', error);
    const auctions = (data ?? []) as unknown as AuctionRow[];
    if (!auctions.length) return [];

    const { data: items } = await this.db
      .from('auction_items')
      .select('auction_id')
      .in(
        'auction_id',
        auctions.map((a) => a.id),
      );
    const counts = new Map<string, number>();
    for (const i of (items ?? []) as unknown as Array<{ auction_id: string }>) {
      counts.set(i.auction_id, (counts.get(i.auction_id) ?? 0) + 1);
    }
    return auctions.map((a) => ({ ...a, item_count: counts.get(a.id) ?? 0 }));
  }

  async getAuction(userId: string, auctionId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const auction = await this.getOwnedAuction(promoter.id, auctionId);
    const { data, error } = await this.db
      .from('auction_items')
      .select('*')
      .eq('auction_id', auction.id)
      .order('sort_order', { ascending: true })
      .order('lot_number', { ascending: true });
    if (error) this.fail('getAuction', error);
    return { ...auction, items: data ?? [] };
  }

  async createAuction(userId: string, dto: unknown) {
    const promoter = await this.getPromoterAccount(userId);
    const input = parseAuctionInput(dto, true);
    if (
      input.starts_at &&
      input.ends_at &&
      ms(input.ends_at) <= ms(input.starts_at)
    ) {
      throw new BadRequestException('End time must be after the start time.');
    }
    const event = await this.eventSnapshot(
      promoter.id,
      input.public_event_id ?? null,
    );
    const organizationId = await this.getOrganizationId(promoter.id);
    await this.checkPageFields(organizationId, null, input);

    const row = {
      slug: input.slug ?? undefined,
      cover_image_url: input.cover_image_url ?? undefined,
      accepts_donations: input.accepts_donations,
      donations_close_at: input.donations_close_at ?? undefined,
      page_published: input.page_published,
      organization_id: organizationId ?? undefined,
      title: input.title,
      description: input.description ?? null,
      anti_snipe_window_seconds: input.anti_snipe_window_seconds,
      anti_snipe_extension_seconds: input.anti_snipe_extension_seconds,
      payment_grace_hours: input.payment_grace_hours,
      default_exposure_limit_cents: input.default_exposure_limit_cents,
      starts_at: input.starts_at ?? null,
      ends_at: input.ends_at ?? null,
      hard_close_at: input.ends_at
        ? new Date(
            ms(input.ends_at) + HARD_CLOSE_MINUTES * 60_000,
          ).toISOString()
        : null,
      ...event,
      promoter_account_id: promoter.id,
      created_by_user_id: userId,
      status: 'draft',
      org_name: promoter.nonprofit_legal_name || promoter.company_name || null,
      org_ein: promoter.nonprofit_ein ?? null,
    };
    // Undefined keys fall back to the column defaults.
    const { data, error } = await this.db
      .from('auctions')
      .insert(row)
      .select('*')
      .single();
    if (error || !data) this.fail('createAuction', error ?? {});
    const created = data as unknown as AuctionRow;
    await this.audit(
      created.id,
      userId,
      'auction_created',
      'auction',
      created.id,
    );
    return created;
  }

  async updateAuction(userId: string, auctionId: string, dto: unknown) {
    const promoter = await this.getPromoterAccount(userId);
    const auction = await this.getOwnedAuction(promoter.id, auctionId);
    const input = parseAuctionInput(dto, false);

    if (!EDITABLE_AUCTION_STATUSES.includes(auction.status)) {
      throw new BadRequestException(
        `A ${auction.status} auction can no longer be edited.`,
      );
    }
    const status = auction.status;
    const patch: Record<string, unknown> = { ...input };

    const pageFieldsTouched =
      input.slug !== undefined ||
      input.cover_image_url !== undefined ||
      input.accepts_donations !== undefined ||
      input.donations_close_at !== undefined ||
      input.page_published !== undefined;
    if (pageFieldsTouched) {
      const organizationId =
        auction.organization_id ?? (await this.getOrganizationId(promoter.id));
      await this.checkPageFields(organizationId, auction, input);
      if (!auction.organization_id && organizationId) {
        patch.organization_id = organizationId;
      }
    }

    if (status === 'live') {
      if (
        input.starts_at !== undefined &&
        ms(input.starts_at) !== ms(auction.starts_at)
      ) {
        throw new BadRequestException(
          'The start time is locked once the auction is live.',
        );
      }
      if (
        input.public_event_id !== undefined &&
        input.public_event_id !== auction.public_event_id
      ) {
        throw new BadRequestException(
          'The linked event is locked once the auction is live.',
        );
      }
      delete patch.starts_at;
      delete patch.public_event_id;
    }

    const endsProvided = input.ends_at !== undefined;
    const startsProvided = status !== 'live' && input.starts_at !== undefined;
    const startsAt = startsProvided ? input.starts_at : auction.starts_at;
    const endsAt = endsProvided ? input.ends_at : auction.ends_at;

    if (status !== 'draft') {
      if (endsProvided && input.ends_at === null) {
        throw new BadRequestException('A published auction needs an end time.');
      }
      if (
        startsProvided &&
        input.starts_at === null &&
        status === 'scheduled'
      ) {
        throw new BadRequestException(
          'A scheduled auction needs a start time.',
        );
      }
    }
    if (startsAt && endsAt && ms(endsAt) <= ms(startsAt)) {
      throw new BadRequestException('End time must be after the start time.');
    }

    const now = Date.now();
    if (status === 'live' && endsProvided) {
      const current = ms(auction.ends_at);
      if (current <= now) {
        throw new BadRequestException('This auction has already ended.');
      }
      if (ms(input.ends_at) < current) {
        throw new BadRequestException(
          'A live auction can be extended but not shortened.',
        );
      }
    } else if (status === 'scheduled' && (endsProvided || startsProvided)) {
      if (ms(endsAt) - Math.max(ms(startsAt), now) < HOUR_MS) {
        throw new BadRequestException(
          'The auction must run for at least 1 hour.',
        );
      }
    }

    if (endsProvided) {
      if (input.ends_at === null) {
        patch.hard_close_at = null;
      } else {
        const target = ms(input.ends_at) + HARD_CLOSE_MINUTES * 60_000;
        const existing =
          status !== 'draft' && auction.hard_close_at
            ? ms(auction.hard_close_at)
            : 0;
        patch.hard_close_at = new Date(
          Math.max(target, existing),
        ).toISOString();
      }
    }

    if (patch.public_event_id !== undefined) {
      Object.assign(
        patch,
        await this.eventSnapshot(
          promoter.id,
          (patch.public_event_id as string | null) ?? null,
        ),
      );
    }

    if (!Object.keys(patch).length) return auction;
    patch.updated_at = new Date().toISOString();

    const { data, error } = await this.db
      .from('auctions')
      .update(patch)
      .eq('id', auction.id)
      .eq('promoter_account_id', promoter.id)
      .eq('status', status)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateAuction', error);
    if (!data) {
      throw new ConflictException('The auction changed; reload and try again.');
    }

    // Items already pushed out by anti-sniping keep their own end; follow an extension.
    if (status === 'live' && endsProvided && input.ends_at) {
      const { error: itemsError } = await this.db
        .from('auction_items')
        .update({ ends_at: input.ends_at, updated_at: patch.updated_at })
        .eq('auction_id', auction.id)
        .eq('status', 'open')
        .not('ends_at', 'is', null)
        .lt('ends_at', input.ends_at);
      if (itemsError) this.fail('extendItemEnds', itemsError);
    }

    await this.audit(
      auction.id,
      userId,
      'auction_updated',
      'auction',
      auction.id,
      {
        fields: Object.keys(input),
      },
    );
    return data as unknown as AuctionRow;
  }

  async publishAuction(userId: string, auctionId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const auction = await this.getOwnedAuction(promoter.id, auctionId);
    if (auction.status !== 'draft') {
      throw new BadRequestException('Only a draft auction can be published.');
    }
    if (!isVerifiedNonprofit(promoter)) {
      throw new BadRequestException(
        'Only verified non-profits can run auctions. Verify your non-profit status first.',
      );
    }
    if (
      !promoter.stripe_account_id ||
      promoter.stripe_connect_status !== 'active'
    ) {
      throw new BadRequestException(
        'Connect your Stripe account (payouts must be active) before publishing an auction.',
      );
    }

    const { data, error } = await this.db
      .from('auction_items')
      .select('*')
      .eq('auction_id', auction.id)
      .order('sort_order', { ascending: true });
    if (error) this.fail('publishAuction', error);
    const items = ((data ?? []) as unknown as AuctionItemRow[]).filter(
      (i) => i.status !== 'withdrawn',
    );
    if (!items.length) {
      throw new BadRequestException('Add at least one item before publishing.');
    }

    if (!auction.ends_at) {
      throw new BadRequestException('Set an end time before publishing.');
    }
    const now = Date.now();
    const startMs = auction.starts_at
      ? Math.max(ms(auction.starts_at), now)
      : now;
    if (ms(auction.ends_at) - startMs < HOUR_MS) {
      throw new BadRequestException(
        'The auction must end at least 1 hour after it starts.',
      );
    }

    const issues: string[] = [];
    for (const item of items) {
      const fmv = item.fair_market_value_cents;
      if (
        fmv === null ||
        fmv === undefined ||
        !Number.isInteger(fmv) ||
        fmv < 0
      ) {
        issues.push(`"${item.title}": fair market value is required`);
      }
      if (item.sale_mode === 'auction') {
        if (!item.starting_bid_cents || item.starting_bid_cents <= 0) {
          issues.push(`"${item.title}": a starting bid is required`);
        }
      } else {
        if (!item.fixed_price_cents || item.fixed_price_cents <= 0) {
          issues.push(`"${item.title}": a price is required`);
        }
        if (!item.quantity || item.quantity < 1) {
          issues.push(`"${item.title}": a quantity is required`);
        }
      }
    }
    if (issues.length) {
      const shown = issues.slice(0, 10).join('; ');
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: `Fix these items before publishing: ${shown}`,
        issues,
      });
    }

    const status: AuctionStatus =
      auction.starts_at && ms(auction.starts_at) > now ? 'scheduled' : 'live';
    const nowIso = new Date(now).toISOString();
    const { data: updated, error: updateError } = await this.db
      .from('auctions')
      .update({
        status,
        starts_at: auction.starts_at ?? nowIso,
        hard_close_at:
          auction.hard_close_at ??
          new Date(
            ms(auction.ends_at) + HARD_CLOSE_MINUTES * 60_000,
          ).toISOString(),
        org_name:
          promoter.nonprofit_legal_name || promoter.company_name || null,
        org_ein: promoter.nonprofit_ein ?? null,
        updated_at: nowIso,
      })
      .eq('id', auction.id)
      .eq('promoter_account_id', promoter.id)
      .eq('status', 'draft')
      .select('*')
      .maybeSingle();
    if (updateError) this.fail('publishAuction', updateError);
    if (!updated) {
      throw new ConflictException('The auction changed; reload and try again.');
    }
    await this.audit(
      auction.id,
      userId,
      'auction_published',
      'auction',
      auction.id,
      {
        status,
        item_count: items.length,
      },
    );
    return updated as unknown as AuctionRow;
  }

  async cancelAuction(userId: string, auctionId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const auction = await this.getOwnedAuction(promoter.id, auctionId);
    if (!EDITABLE_AUCTION_STATUSES.includes(auction.status)) {
      throw new BadRequestException(
        `A ${auction.status} auction cannot be cancelled.`,
      );
    }
    const { data: active } = await this.db
      .from('auction_orders')
      .select('id')
      .eq('auction_id', auction.id)
      .eq('promoter_account_id', promoter.id)
      .in('status', ACTIVE_ORDER_STATUSES)
      .limit(1);
    if (((active ?? []) as unknown[]).length) {
      throw new BadRequestException(
        'This auction has active orders. Cancel or refund them before cancelling the auction.',
      );
    }

    const { data, error } = await this.db
      .from('auctions')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', auction.id)
      .eq('promoter_account_id', promoter.id)
      .eq('status', auction.status)
      .select('*')
      .maybeSingle();
    if (error) this.fail('cancelAuction', error);
    if (!data) {
      throw new ConflictException('The auction changed; reload and try again.');
    }
    await this.audit(
      auction.id,
      userId,
      'auction_cancelled',
      'auction',
      auction.id,
      {
        previous_status: auction.status,
      },
    );
    return data as unknown as AuctionRow;
  }

  // ─── items ───────────────────────────────────────────────────

  /** `source` is set only by the donation-approval flow (which also allows a donation's 6 photos), never from a request body. */
  async createItem(
    userId: string,
    auctionId: string,
    dto: unknown,
    source: { source_donation_id?: string } = {},
  ) {
    const promoter = await this.getPromoterAccount(userId);
    const auction = await this.getOwnedAuction(promoter.id, auctionId);
    this.assertAuctionOpenForItemChanges(auction);

    const patch = normalizeItemPatch(
      null,
      parseItemInput(
        dto,
        true,
        source.source_donation_id ? MAX_IMAGES_PER_DONATION : undefined,
      ),
    );
    const { count } = await this.db
      .from('auction_items')
      .select('id', { count: 'exact', head: true })
      .eq('auction_id', auction.id);
    if ((count ?? 0) >= MAX_ITEMS_PER_AUCTION) {
      throw new BadRequestException(
        `An auction can have at most ${MAX_ITEMS_PER_AUCTION} items.`,
      );
    }

    const { data, error } = await this.db
      .from('auction_items')
      .insert({
        ...patch,
        ...source,
        auction_id: auction.id,
        status: 'open',
      })
      .select('*')
      .single();
    if (error || !data) this.fail('createItem', error ?? {});
    const item = data as unknown as AuctionItemRow;
    await this.audit(auction.id, userId, 'item_created', 'item', item.id, {
      sale_mode: item.sale_mode,
    });
    return item;
  }

  async updateItem(userId: string, itemId: string, dto: unknown) {
    const promoter = await this.getPromoterAccount(userId);
    const { item, auction } = await this.getOwnedItem(promoter.id, itemId);
    this.assertAuctionOpenForItemChanges(auction);
    if (item.status !== 'open') {
      throw new BadRequestException(`A ${item.status} item cannot be edited.`);
    }

    const input = parseItemInput(dto, false);
    const patch = normalizeItemPatch(item, input);
    this.assertItemEditLocks(item, patch);

    const { data, error } = await this.db
      .from('auction_items')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', item.id)
      .eq('status', 'open')
      // A bid or sale landing since we read the row invalidates the lock check.
      .eq('bid_count', item.bid_count)
      .eq('quantity_sold', item.quantity_sold)
      .select('*')
      .maybeSingle();
    if (error) this.fail('updateItem', error);
    if (!data) {
      throw new ConflictException('The item changed; reload and try again.');
    }
    await this.audit(auction.id, userId, 'item_updated', 'item', item.id, {
      fields: Object.keys(input),
    });
    return data as unknown as AuctionItemRow;
  }

  /** Once bids or sales exist the price terms are frozen. */
  private assertItemEditLocks(item: AuctionItemRow, patch: ItemPatch): void {
    let locked: Array<keyof ItemPatch> = [];
    let reason = '';
    if (item.bid_count > 0) {
      locked = [
        'sale_mode',
        'starting_bid_cents',
        'reserve_cents',
        'increment_cents',
        'buy_now_cents',
        'fixed_price_cents',
      ];
      reason = 'has bids';
    } else if (item.quantity_sold > 0) {
      locked = ['sale_mode', 'fixed_price_cents'];
      reason = 'has sales';
    }
    for (const key of locked) {
      if (patch[key] !== undefined && patch[key] !== item[key]) {
        throw new BadRequestException(
          `Pricing and sale mode cannot be changed because this item ${reason}.`,
        );
      }
    }
    if (patch.quantity !== undefined && patch.quantity < item.quantity_sold) {
      throw new BadRequestException(
        'Quantity cannot be lower than the number already sold.',
      );
    }
  }

  async deleteItem(userId: string, itemId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const { item, auction } = await this.getOwnedItem(promoter.id, itemId);
    this.assertAuctionOpenForItemChanges(auction);
    if (
      item.bid_count > 0 ||
      item.quantity_sold > 0 ||
      item.status === 'sold'
    ) {
      throw new BadRequestException(
        'This item has bids or sales and cannot be deleted. Withdraw it instead.',
      );
    }
    const { data, error } = await this.db
      .from('auction_items')
      .delete()
      .eq('id', item.id)
      .eq('bid_count', 0)
      .eq('quantity_sold', 0)
      .select('id')
      .maybeSingle();
    if (error) this.fail('deleteItem', error);
    if (!data) {
      throw new ConflictException('The item changed; reload and try again.');
    }
    await this.audit(auction.id, userId, 'item_deleted', 'item', item.id, {
      title: item.title,
    });
    return { deleted: true };
  }

  async withdrawItem(userId: string, itemId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const { item, auction } = await this.getOwnedItem(promoter.id, itemId);
    if (!['scheduled', 'live'].includes(auction.status)) {
      throw new BadRequestException(
        'Only items of a scheduled or live auction can be withdrawn.',
      );
    }
    if (item.status !== 'open') {
      throw new BadRequestException(
        `A ${item.status} item cannot be withdrawn.`,
      );
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await this.db
      .from('auction_items')
      .update({
        status: 'withdrawn',
        buy_now_available: false,
        closed_at: nowIso,
        updated_at: nowIso,
      })
      .eq('id', item.id)
      .eq('status', 'open')
      .select('*')
      .maybeSingle();
    if (error) this.fail('withdrawItem', error);
    if (!data) {
      throw new ConflictException('The item changed; reload and try again.');
    }

    // Bidders with a standing max are told their bid is void.
    const { data: proxies } = await this.db
      .from('auction_proxy_bids')
      .select('bidder_id')
      .eq('item_id', item.id);
    const rows = (
      (proxies ?? []) as unknown as Array<{ bidder_id: string }>
    ).map((p) => ({
      auction_id: auction.id,
      item_id: item.id,
      bidder_id: p.bidder_id,
      kind: ITEM_WITHDRAWN_OUTBOX_KIND,
      payload: { item_title: item.title },
    }));
    if (rows.length) {
      const { error: outboxError } = await this.db
        .from('auction_outbox')
        .insert(rows);
      if (outboxError) {
        this.logger.error(`withdraw outbox failed (${outboxError.code})`);
      }
    }

    // The closer only ends an auction while closing items, so end it here if this was the last open one.
    if (auction.status === 'live') {
      const { data: open } = await this.db
        .from('auction_items')
        .select('id')
        .eq('auction_id', auction.id)
        .eq('status', 'open')
        .limit(1);
      if (!((open ?? []) as unknown[]).length) {
        await this.db
          .from('auctions')
          .update({ status: 'closed', closed_at: nowIso, updated_at: nowIso })
          .eq('id', auction.id)
          .eq('status', 'live');
      }
    }

    await this.audit(auction.id, userId, 'item_withdrawn', 'item', item.id, {
      bid_count: item.bid_count,
      notified_bidders: rows.length,
    });
    return data as unknown as AuctionItemRow;
  }

  async resolveReserve(userId: string, itemId: string, dto: unknown) {
    const promoter = await this.getPromoterAccount(userId);
    const { item, auction } = await this.getOwnedItem(promoter.id, itemId);
    const body = asObject(dto);
    if (typeof body.accept !== 'boolean') {
      throw new BadRequestException('accept must be true or false.');
    }
    if (item.status !== 'reserve_not_met') {
      throw new BadRequestException(
        'This item is not waiting for a reserve decision.',
      );
    }
    const { data, error } = await this.db.rpc('resolve_reserve_item', {
      p_item_id: item.id,
      p_accept: body.accept,
    });
    if (error) this.fail('resolveReserve', error);
    const result = data as unknown as ResolveReserveResult;
    if (!result?.ok) {
      throw new ConflictException(
        'This item is no longer waiting for a reserve decision.',
      );
    }
    // The RPC writes its own audit row without an actor; this one records who decided.
    await this.audit(auction.id, userId, 'reserve_decision', 'item', item.id, {
      accept: body.accept,
      accepted: result.accepted,
    });
    return { accepted: result.accepted };
  }

  // ─── bidders ─────────────────────────────────────────────────

  async blockBidder(userId: string, bidderId: string, dto: unknown) {
    const promoter = await this.getPromoterAccount(userId);
    const { bidder, auction } = await this.getOwnedBidder(
      promoter.id,
      bidderId,
    );
    const body = asObject(dto);
    const reason =
      body.reason === undefined
        ? null
        : optionalText(body.reason, 'Reason', 500);
    if (bidder.blocked_at) return { blocked: true };

    const nowIso = new Date().toISOString();
    const { data, error } = await this.db
      .from('auction_bidders')
      .update({
        blocked_at: nowIso,
        blocked_reason: reason,
        updated_at: nowIso,
      })
      .eq('id', bidder.id)
      .eq('auction_id', auction.id)
      .select('id')
      .maybeSingle();
    if (error) this.fail('blockBidder', error);
    if (!data) throw new NotFoundException('Bidder not found');
    await this.audit(
      auction.id,
      userId,
      'bidder_blocked',
      'bidder',
      bidder.id,
      {
        reason,
        paddle_number: bidder.paddle_number,
      },
    );
    return { blocked: true };
  }

  async unblockBidder(userId: string, bidderId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const { bidder, auction } = await this.getOwnedBidder(
      promoter.id,
      bidderId,
    );
    if (!bidder.blocked_at) return { blocked: false };

    const { data, error } = await this.db
      .from('auction_bidders')
      .update({
        blocked_at: null,
        blocked_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bidder.id)
      .eq('auction_id', auction.id)
      .select('id')
      .maybeSingle();
    if (error) this.fail('unblockBidder', error);
    if (!data) throw new NotFoundException('Bidder not found');
    await this.audit(
      auction.id,
      userId,
      'bidder_unblocked',
      'bidder',
      bidder.id,
      {
        paddle_number: bidder.paddle_number,
      },
    );
    return { blocked: false };
  }

  // ─── orders ──────────────────────────────────────────────────

  private requireCharger(): AuctionOrderCharger {
    if (!this.charger) {
      throw new ServiceUnavailableException(
        'Payment processing is not available right now.',
      );
    }
    return this.charger;
  }

  async retryCharge(userId: string, orderId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const order = await this.getOwnedOrder(promoter.id, orderId);
    if (!RETRYABLE_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        'Only failed orders or orders needing customer action can be retried.',
      );
    }
    const outcome = await this.requireCharger().retryCharge(order.id);
    await this.audit(
      order.auction_id,
      userId,
      'order_retry_charge',
      'order',
      order.id,
      {
        outcome: outcome.status,
      },
    );
    return outcome;
  }

  async sendPayLink(userId: string, orderId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const order = await this.getOwnedOrder(promoter.id, orderId);
    if (!UNPAID_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        'A pay link can only be sent for an unpaid order.',
      );
    }
    const result = await this.requireCharger().sendPayLink(order.id);
    await this.audit(
      order.auction_id,
      userId,
      'order_pay_link_sent',
      'order',
      order.id,
      {
        sent: result.sent,
      },
    );
    return result;
  }

  async markPaidOffline(userId: string, orderId: string, dto: unknown) {
    const promoter = await this.getPromoterAccount(userId);
    const order = await this.getOwnedOrder(promoter.id, orderId);
    const body = asObject(dto);
    const note =
      body.note === undefined ? null : optionalText(body.note, 'Note', 500);
    if (!UNPAID_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `A ${order.status} order cannot be marked as paid.`,
      );
    }

    const amount =
      order.total_cents > 0 ? order.total_cents : order.subtotal_cents;
    const nowIso = new Date().toISOString();
    const { data, error } = await this.db
      .from('auction_orders')
      .update({
        status: 'paid',
        paid_at: nowIso,
        amount_received_cents: amount,
        claimed_at: null,
        last_error_code: null,
        last_error_message: null,
        updated_at: nowIso,
      })
      .eq('id', order.id)
      .eq('promoter_account_id', promoter.id)
      .in('status', UNPAID_ORDER_STATUSES)
      .select('*')
      .maybeSingle();
    if (error) this.fail('markPaidOffline', error);
    if (!data) {
      throw new ConflictException('The order changed; reload and try again.');
    }

    const { error: outboxError } = await this.db.from('auction_outbox').insert({
      auction_id: order.auction_id,
      order_id: order.id,
      bidder_id: order.bidder_id,
      kind: 'payment_succeeded',
      payload: { total_cents: amount, offline: true },
    });
    if (outboxError) {
      this.logger.error(`mark-paid outbox failed (${outboxError.code})`);
    }
    await this.audit(
      order.auction_id,
      userId,
      'order_marked_paid_offline',
      'order',
      order.id,
      {
        previous_status: order.status,
        amount_received_cents: amount,
        note,
      },
    );
    return data as unknown as AuctionOrderRow;
  }

  /** Cancelling an order does not return its items to sale: they stay sold and the cancellation is audited. */
  async cancelOrder(userId: string, orderId: string) {
    const promoter = await this.getPromoterAccount(userId);
    const order = await this.getOwnedOrder(promoter.id, orderId);
    if (!UNPAID_ORDER_STATUSES.includes(order.status)) {
      throw new BadRequestException(
        `A ${order.status} order cannot be cancelled.`,
      );
    }
    const { data, error } = await this.db
      .from('auction_orders')
      .update({
        status: 'cancelled',
        claimed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .eq('promoter_account_id', promoter.id)
      .in('status', UNPAID_ORDER_STATUSES)
      .select('*')
      .maybeSingle();
    if (error) this.fail('cancelOrder', error);
    if (!data) {
      throw new ConflictException('The order changed; reload and try again.');
    }
    await this.audit(
      order.auction_id,
      userId,
      'order_cancelled',
      'order',
      order.id,
      {
        previous_status: order.status,
        total_cents: order.total_cents,
      },
    );
    return data as unknown as AuctionOrderRow;
  }
}
