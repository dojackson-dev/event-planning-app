import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { BidderContext } from './bidder.guard';
import { isPubliclyVisible } from '../auction-phase';
import {
  PUBLIC_AUCTION_COLUMNS,
  PUBLIC_AUCTION_COLUMNS_BASE,
  PUBLIC_ITEM_COLUMNS,
  PUBLIC_ITEM_COLUMNS_BASE,
  toBidFeedEntry,
  toPublicAuction,
  toPublicItemState,
  toPublicItemSummary,
} from './dto/public-views';
import type {
  BidFeedSource,
  PublicAuction,
  PublicAuctionSource,
  PublicItemSource,
  PublicItemState,
} from './dto/public-views';

const OPEN_STATUSES = ['scheduled', 'live'];
/** PostgREST/Postgres codes for a missing column, relationship or table (migration not applied yet). */
const SCHEMA_GAP_CODES = new Set([
  '42703',
  '42P01',
  'PGRST200',
  'PGRST204',
  'PGRST205',
]);

type DbResult = {
  data: unknown;
  error: { code?: string; message: string } | null;
};
const STATE_CACHE_TTL_MS = 1000;
const STATE_CACHE_MAX_ENTRIES = 500;
const BID_FEED_LIMIT = 50;

interface StateSnapshot {
  auction: Pick<
    PublicAuction,
    'id' | 'status' | 'starts_at' | 'ends_at' | 'phase'
  >;
  items: Array<{ view: PublicItemState; leaderId: string | null }>;
}

@Injectable()
export class AuctionPublicService {
  private readonly logger = new Logger(AuctionPublicService.name);
  private readonly stateCache = new Map<
    string,
    { at: number; snapshot: Promise<StateSnapshot> }
  >();

  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private fail(what: string, message: string): never {
    this.logger.error(`${what}: ${message}`);
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  /**
   * Runs a query with the full column list and, if the organization-pages migration has not been applied
   * yet, once more with the original columns so existing auctions keep working.
   */
  private async withColumns(
    run: (columns: string) => PromiseLike<DbResult>,
    columns: string,
    legacyColumns: string,
  ): Promise<{ result: DbResult; legacy: boolean }> {
    const result = await run(columns);
    if (result.error?.code && SCHEMA_GAP_CODES.has(result.error.code)) {
      this.logger.warn(
        'Auction organization-pages migration not applied; using legacy columns.',
      );
      return { result: await run(legacyColumns), legacy: true };
    }
    return { result, legacy: false };
  }

  /**
   * The auction must belong to a verified non-profit promoter and be publicly visible: published
   * (scheduled/live/closed/settled) or with its page switched on. Pass `statuses` to require specific statuses.
   */
  async loadPublicAuction(
    auctionId: string,
    statuses?: string[],
  ): Promise<PublicAuctionSource> {
    const { result } = await this.withColumns(
      (columns) =>
        this.db
          .from('auctions')
          .select(
            `${columns}, promoter_accounts!inner(is_nonprofit, nonprofit_status)`,
          )
          .eq('id', auctionId)
          .eq('promoter_accounts.is_nonprofit', true)
          .eq('promoter_accounts.nonprofit_status', 'verified')
          .maybeSingle() as unknown as PromiseLike<DbResult>,
      PUBLIC_AUCTION_COLUMNS,
      PUBLIC_AUCTION_COLUMNS_BASE,
    );
    if (result.error) this.fail('Auction lookup failed', result.error.message);
    if (!result.data) throw new NotFoundException('Auction not found.');
    const row = this.normalizeAuction(result.data);
    const visible = statuses
      ? statuses.includes(row.status)
      : isPubliclyVisible(row);
    if (!visible) throw new NotFoundException('Auction not found.');
    return row;
  }

  /** The embedded organization arrives as an object (many-to-one); tolerate a one-element array too. */
  private normalizeAuction(data: unknown): PublicAuctionSource {
    const row = data as PublicAuctionSource & {
      organization?: unknown;
    };
    const org = Array.isArray(row.organization)
      ? row.organization[0]
      : row.organization;
    return {
      ...row,
      organization: (org as PublicAuctionSource['organization']) ?? null,
    };
  }

  /** Registration is only open for scheduled/live auctions that have not ended. */
  async requireRegistrableAuction(
    auctionId: string,
  ): Promise<PublicAuctionSource> {
    const auction = await this.loadPublicAuction(auctionId, OPEN_STATUSES);
    if (auction.ends_at && new Date(auction.ends_at).getTime() <= Date.now()) {
      throw new NotFoundException('Auction not found.');
    }
    return auction;
  }

  async listAuctions(): Promise<{
    auctions: Array<PublicAuction & { item_count: number }>;
  }> {
    // Every verified non-profit's scheduled/live auction is listed (draft pages are reached by their own link).
    const { result } = await this.withColumns(
      (columns) =>
        this.db
          .from('auctions')
          .select(
            `${columns}, promoter_accounts!inner(is_nonprofit, nonprofit_status)`,
          )
          .in('status', OPEN_STATUSES)
          .gt('ends_at', new Date().toISOString())
          .eq('promoter_accounts.is_nonprofit', true)
          .eq('promoter_accounts.nonprofit_status', 'verified')
          .order('starts_at', { ascending: true })
          .limit(100) as unknown as PromiseLike<DbResult>,
      PUBLIC_AUCTION_COLUMNS,
      PUBLIC_AUCTION_COLUMNS_BASE,
    );
    if (result.error) this.fail('Auction list failed', result.error.message);
    const rows = ((result.data ?? []) as unknown[]).map((r) =>
      this.normalizeAuction(r),
    );
    if (rows.length === 0) return { auctions: [] };

    const { data: itemRows, error: itemError } = await this.db
      .from('auction_items')
      .select('auction_id')
      .in(
        'auction_id',
        rows.map((r) => r.id),
      )
      .neq('status', 'withdrawn')
      .limit(5000);
    if (itemError) this.fail('Auction item count failed', itemError.message);
    const counts = new Map<string, number>();
    for (const item of (itemRows ?? []) as Array<{ auction_id: string }>) {
      counts.set(item.auction_id, (counts.get(item.auction_id) ?? 0) + 1);
    }
    return {
      auctions: rows.map((row) => ({
        ...toPublicAuction(row, counts.get(row.id) ?? 0),
        item_count: counts.get(row.id) ?? 0,
      })),
    };
  }

  private async queryItems(
    run: (columns: string) => PromiseLike<DbResult>,
  ): Promise<PublicItemSource[]> {
    const { result, legacy } = await this.withColumns(
      run,
      PUBLIC_ITEM_COLUMNS,
      PUBLIC_ITEM_COLUMNS_BASE,
    );
    if (result.error) this.fail('Item list failed', result.error.message);
    const rows = (result.data ?? []) as PublicItemSource[];
    // Without the migration every item predates donor consent: attribution behaves as before.
    return legacy ? rows.map((r) => ({ ...r, donor_recognition: true })) : rows;
  }

  async loadItems(auctionId: string): Promise<PublicItemSource[]> {
    return this.queryItems(
      (columns) =>
        this.db
          .from('auction_items')
          .select(columns)
          .eq('auction_id', auctionId)
          .neq('status', 'withdrawn')
          .order('sort_order', { ascending: true })
          .order('lot_number', {
            ascending: true,
          }) as unknown as PromiseLike<DbResult>,
    );
  }

  async getAuction(auctionId: string) {
    const auction = await this.loadPublicAuction(auctionId);
    const items = await this.loadItems(auctionId);
    return {
      auction: toPublicAuction(auction, items.length),
      items: items.map((item) => toPublicItemSummary(item, auction.ends_at)),
    };
  }

  private snapshot(auctionId: string): Promise<StateSnapshot> {
    const cached = this.stateCache.get(auctionId);
    if (cached && Date.now() - cached.at < STATE_CACHE_TTL_MS) {
      return cached.snapshot;
    }
    if (this.stateCache.size >= STATE_CACHE_MAX_ENTRIES) {
      const cutoff = Date.now() - STATE_CACHE_TTL_MS;
      for (const [key, entry] of this.stateCache) {
        if (entry.at < cutoff) this.stateCache.delete(key);
      }
    }
    const snapshot = (async (): Promise<StateSnapshot> => {
      const auction = await this.loadPublicAuction(auctionId);
      const items = await this.loadItems(auctionId);
      return {
        auction: {
          id: auction.id,
          status: auction.status,
          starts_at: auction.starts_at,
          ends_at: auction.ends_at,
          phase: toPublicAuction(auction, items.length).phase,
        },
        items: items.map((item) => ({
          view: toPublicItemState(item, auction.ends_at),
          leaderId: item.leader_bidder_id,
        })),
      };
    })();
    this.stateCache.set(auctionId, { at: Date.now(), snapshot });
    snapshot.catch(() => {
      if (this.stateCache.get(auctionId)?.snapshot === snapshot) {
        this.stateCache.delete(auctionId);
      }
    });
    return snapshot;
  }

  /** Polling endpoint. The anonymous part is cached ~1s; `you_are_leading` is added per request for a valid bidder. */
  async getState(auctionId: string, bidder: BidderContext | null) {
    const snap = await this.snapshot(auctionId);
    const me =
      bidder && bidder.auctionId === auctionId ? bidder.bidderId : null;
    return {
      now: new Date().toISOString(),
      auction: { ...snap.auction },
      items: snap.items.map(({ view, leaderId }) =>
        me === null
          ? { ...view }
          : { ...view, you_are_leading: leaderId === me },
      ),
    };
  }

  async getItem(itemId: string) {
    const [item] = await this.queryItems(
      (columns) =>
        this.db
          .from('auction_items')
          .select(columns)
          .eq('id', itemId)
          .neq('status', 'withdrawn')
          .limit(1) as unknown as PromiseLike<DbResult>,
    );
    if (!item) throw new NotFoundException('Item not found.');
    const auction = await this.loadPublicAuction(item.auction_id);

    const { data: bids, error: bidError } = await this.db
      .from('auction_bids')
      .select(
        'id, amount_cents, created_at, bidder:auction_bidders(paddle_number)',
      )
      .eq('item_id', itemId)
      .order('id', { ascending: false })
      .limit(BID_FEED_LIMIT);
    if (bidError) this.fail('Bid feed failed', bidError.message);

    return {
      auction: toPublicAuction(auction, 1),
      item: toPublicItemSummary(item, auction.ends_at),
      bids: ((bids ?? []) as unknown as BidFeedSource[]).map(toBidFeedEntry),
    };
  }
}
