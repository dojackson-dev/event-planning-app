import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import type { BidderContext } from './bidder.guard';
import {
  PUBLIC_AUCTION_COLUMNS,
  PUBLIC_ITEM_COLUMNS,
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

const VISIBLE_STATUSES = ['scheduled', 'live', 'closed', 'settled'];
const OPEN_STATUSES = ['scheduled', 'live'];
const STATE_CACHE_TTL_MS = 1000;
const STATE_CACHE_MAX_ENTRIES = 500;
const BID_FEED_LIMIT = 50;

interface StateSnapshot {
  auction: Pick<PublicAuction, 'id' | 'status' | 'starts_at' | 'ends_at'>;
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

  /** The auction must belong to a verified non-profit promoter and be in a publicly visible state. */
  async loadPublicAuction(
    auctionId: string,
    statuses: string[] = VISIBLE_STATUSES,
  ): Promise<PublicAuctionSource> {
    const { data, error } = await this.db
      .from('auctions')
      .select(
        `${PUBLIC_AUCTION_COLUMNS}, promoter_accounts!inner(is_nonprofit, nonprofit_status)`,
      )
      .eq('id', auctionId)
      .in('status', statuses)
      .eq('promoter_accounts.is_nonprofit', true)
      .eq('promoter_accounts.nonprofit_status', 'verified')
      .maybeSingle();
    if (error) this.fail('Auction lookup failed', error.message);
    if (!data) throw new NotFoundException('Auction not found.');
    return data as PublicAuctionSource;
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
    // The schema has no per-auction visibility flag yet, so every verified non-profit's live/upcoming auction is listed.
    const { data, error } = await this.db
      .from('auctions')
      .select(
        `${PUBLIC_AUCTION_COLUMNS}, promoter_accounts!inner(is_nonprofit, nonprofit_status)`,
      )
      .in('status', OPEN_STATUSES)
      .gt('ends_at', new Date().toISOString())
      .eq('promoter_accounts.is_nonprofit', true)
      .eq('promoter_accounts.nonprofit_status', 'verified')
      .order('starts_at', { ascending: true })
      .limit(100);
    if (error) this.fail('Auction list failed', error.message);
    const rows = (data ?? []) as PublicAuctionSource[];
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
        ...toPublicAuction(row),
        item_count: counts.get(row.id) ?? 0,
      })),
    };
  }

  private async loadItems(auctionId: string): Promise<PublicItemSource[]> {
    const { data, error } = await this.db
      .from('auction_items')
      .select(PUBLIC_ITEM_COLUMNS)
      .eq('auction_id', auctionId)
      .neq('status', 'withdrawn')
      .order('sort_order', { ascending: true })
      .order('lot_number', { ascending: true });
    if (error) this.fail('Item list failed', error.message);
    return (data ?? []) as PublicItemSource[];
  }

  async getAuction(auctionId: string) {
    const auction = await this.loadPublicAuction(auctionId);
    const items = await this.loadItems(auctionId);
    return {
      auction: toPublicAuction(auction),
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
    const { data, error } = await this.db
      .from('auction_items')
      .select(PUBLIC_ITEM_COLUMNS)
      .eq('id', itemId)
      .neq('status', 'withdrawn')
      .maybeSingle();
    if (error) this.fail('Item lookup failed', error.message);
    if (!data) throw new NotFoundException('Item not found.');
    const item = data as PublicItemSource;
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
      auction: toPublicAuction(auction),
      item: toPublicItemSummary(item, auction.ends_at),
      bids: ((bids ?? []) as unknown as BidFeedSource[]).map(toBidFeedEntry),
    };
  }
}
