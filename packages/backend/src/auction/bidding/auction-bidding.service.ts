import {
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { AUCTION_PLATFORM_FEE_RATE } from '../auction-money';
import { AUCTION_ORDER_CHARGER } from '../auction-ports';
import type { AuctionOrderCharger, ChargeOutcome } from '../auction-ports';
import type {
  ClaimFixedItemResult,
  ClaimItemNowResult,
  PlaceBidResult,
} from '../auction.types';
import type { BidderContext } from './bidder.guard';
import { codedError, tooManyRequests } from './bidding-errors';
import type { PlaceBidDto } from './dto/bid.dto';

/** Bids above max($2,500, 2x the current price) need an explicit confirmation. */
export const LARGE_BID_FLOOR_CENTS = 250_000;
export const BID_RATE_LIMIT_PER_MINUTE = 20;
const ATTEMPT_LIMIT_PER_MINUTE = 30;

export function largeBidThresholdCents(currentPriceCents: number): number {
  return Math.max(LARGE_BID_FLOOR_CENTS, currentPriceCents * 2);
}

type Failure = { code: string };

const MESSAGES: Record<string, [number, string]> = {
  bid_too_low: [409, 'That bid is below the minimum next bid.'],
  max_not_raised: [
    409,
    'Your maximum bid must be higher than your current maximum.',
  ],
  item_closed: [410, 'Bidding on this item has closed.'],
  auction_not_live: [410, 'This auction is not accepting bids right now.'],
  bidder_blocked: [403, 'Your bidder account cannot place bids.'],
  email_not_verified: [403, 'Verify your email before bidding.'],
  phone_not_verified: [403, 'Verify your phone number before bidding.'],
  card_not_ready: [403, 'Add a payment card before bidding.'],
  exposure_limit: [403, 'This would exceed your bidding limit.'],
  invalid_request: [400, 'That request is not valid.'],
  not_an_auction_item: [400, 'This item is not sold by auction.'],
  not_a_fixed_item: [400, 'This item is not sold at a fixed price.'],
  item_not_found: [404, 'Item not found.'],
  bidder_not_found: [401, 'Please verify to bid.'],
  bidding_started: [409, 'Bidding has already started on this item.'],
  buy_now_unavailable: [409, 'Buy it now is not available for this item.'],
  insufficient_quantity: [409, 'Not enough quantity remaining.'],
  per_bidder_limit: [409, 'You have reached the purchase limit for this item.'],
};

/** Keys from the RPC failure JSON that are safe and useful to return. */
const FAILURE_EXTRAS = [
  'min_next_bid_cents',
  'your_max_cents',
  'exposure_limit_cents',
  'remaining',
  'limit',
] as const;

export function mapRpcFailure(failure: Failure) {
  const [status, message] = MESSAGES[failure.code] ?? [
    500,
    'Something went wrong. Please try again.',
  ];
  const extra: Record<string, unknown> = {};
  for (const key of FAILURE_EXTRAS) {
    const value = (failure as Record<string, unknown>)[key];
    if (value !== undefined) extra[key] = value;
  }
  return codedError(
    status,
    status === 500 ? 'internal_error' : failure.code,
    message,
    extra,
  );
}

@Injectable()
export class AuctionBiddingService {
  private readonly logger = new Logger(AuctionBiddingService.name);
  private readonly attempts = new Map<string, number[]>();

  constructor(
    private readonly supabase: SupabaseService,
    @Inject(AUCTION_ORDER_CHARGER)
    @Optional()
    private readonly charger?: AuctionOrderCharger,
  ) {}

  private get db() {
    return this.supabase.getAdminClient();
  }

  private unavailable(what: string, message: string): never {
    this.logger.error(`${what}: ${message}`);
    throw new ServiceUnavailableException('Please try again shortly.');
  }

  /** In-process guard for rejected attempts, which leave no database row to count. */
  private checkAttemptRate(bidderId: string): void {
    const now = Date.now();
    const recent = (this.attempts.get(bidderId) ?? []).filter(
      (t) => now - t < 60_000,
    );
    if (recent.length >= ATTEMPT_LIMIT_PER_MINUTE) {
      this.attempts.set(bidderId, recent);
      throw tooManyRequests('You are bidding too fast. Please slow down.');
    }
    recent.push(now);
    this.attempts.set(bidderId, recent);
    if (this.attempts.size > 5000) {
      for (const [key, times] of this.attempts) {
        if (!times.some((t) => now - t < 60_000)) this.attempts.delete(key);
      }
    }
  }

  /** Database-backed limit: manual bids recorded in the last minute. */
  private async checkBidRate(bidderId: string): Promise<void> {
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count, error } = await this.db
      .from('auction_bids')
      .select('id', { count: 'exact', head: true })
      .eq('bidder_id', bidderId)
      .eq('kind', 'manual')
      .gte('created_at', since);
    if (error) this.unavailable('Bid rate query failed', error.message);
    if ((count ?? 0) >= BID_RATE_LIMIT_PER_MINUTE) {
      throw tooManyRequests(
        `You can place up to ${BID_RATE_LIMIT_PER_MINUTE} bids per minute.`,
      );
    }
  }

  private async loadBidItem(bidder: BidderContext, itemId: string) {
    const { data, error } = await this.db
      .from('auction_items')
      .select(
        'id, auction_id, sale_mode, current_price_cents, starting_bid_cents, bid_count',
      )
      .eq('id', itemId)
      .maybeSingle();
    if (error) this.unavailable('Item lookup failed', error.message);
    const item = data as {
      auction_id: string;
      sale_mode: string;
      current_price_cents: number;
      starting_bid_cents: number | null;
      bid_count: number;
    } | null;
    if (!item || item.auction_id !== bidder.auctionId) {
      throw mapRpcFailure({ code: 'item_not_found' });
    }
    return item;
  }

  async placeBid(bidder: BidderContext, itemId: string, dto: PlaceBidDto) {
    this.checkAttemptRate(bidder.bidderId);
    await this.checkBidRate(bidder.bidderId);

    const item = await this.loadBidItem(bidder, itemId);
    if (item.sale_mode !== 'auction') {
      throw mapRpcFailure({ code: 'not_an_auction_item' });
    }
    const referencePrice = Math.max(
      item.current_price_cents,
      item.starting_bid_cents ?? 0,
    );
    const threshold = largeBidThresholdCents(referencePrice);
    if (dto.amountCents > threshold && !dto.confirmLargeBid) {
      throw codedError(
        409,
        'large_bid_confirmation_required',
        'This is a large bid. Confirm to place it.',
        { confirm_above_cents: threshold, amount_cents: dto.amountCents },
      );
    }

    const { data, error } = await this.db.rpc('place_auction_bid', {
      p_item_id: itemId,
      p_bidder_id: bidder.bidderId,
      p_amount_cents: dto.amountCents,
      p_mode: dto.mode,
    });
    if (error) this.unavailable('place_auction_bid failed', error.message);

    const result = data as PlaceBidResult;
    if (!result || result.ok !== true) {
      throw mapRpcFailure(result ?? { code: 'internal_error' });
    }
    // leader_bidder_id is deliberately dropped: another bidder's id is not for clients.
    return {
      ok: true,
      outcome: result.outcome,
      current_price_cents: result.current_price_cents,
      you_are_leading: result.you_are_leading,
      your_max_cents: result.your_max_cents,
      min_next_bid_cents: result.min_next_bid_cents,
      bid_count: result.bid_count,
      ends_at: result.ends_at,
      extended: result.extended,
      reserve_met: result.reserve_met,
      buy_now_available: result.buy_now_available,
    };
  }

  private async chargeNow(orderId: string): Promise<ChargeOutcome | null> {
    if (!this.charger) return null;
    try {
      return await this.charger.chargeOrderNow(orderId);
    } catch (err) {
      // The order already exists; the closer/charge worker retries it.
      this.logger.error(
        `chargeOrderNow failed for order ${orderId}: ${(err as Error)?.message}`,
      );
      return { orderId, status: 'pending' };
    }
  }

  async buyNow(bidder: BidderContext, itemId: string) {
    this.checkAttemptRate(bidder.bidderId);
    const { data, error } = await this.db.rpc('claim_item_now', {
      p_item_id: itemId,
      p_bidder_id: bidder.bidderId,
      p_platform_fee_rate: AUCTION_PLATFORM_FEE_RATE,
    });
    if (error) this.unavailable('claim_item_now failed', error.message);
    const result = data as ClaimItemNowResult;
    if (!result || result.ok !== true) {
      throw mapRpcFailure(result ?? { code: 'internal_error' });
    }
    return {
      ok: true,
      order_id: result.order_id,
      item_id: result.item_id,
      price_cents: result.price_cents,
      charge: await this.chargeNow(result.order_id),
    };
  }

  async purchase(bidder: BidderContext, itemId: string, quantity: number) {
    this.checkAttemptRate(bidder.bidderId);
    const { data, error } = await this.db.rpc('claim_fixed_item', {
      p_item_id: itemId,
      p_bidder_id: bidder.bidderId,
      p_quantity: quantity,
      p_platform_fee_rate: AUCTION_PLATFORM_FEE_RATE,
    });
    if (error) this.unavailable('claim_fixed_item failed', error.message);
    const result = data as ClaimFixedItemResult;
    if (!result || result.ok !== true) {
      throw mapRpcFailure(result ?? { code: 'internal_error' });
    }
    return {
      ok: true,
      order_id: result.order_id,
      item_id: result.item_id,
      subtotal_cents: result.subtotal_cents,
      quantity: result.quantity,
      charge: await this.chargeNow(result.order_id),
    };
  }

  async getMe(bidder: BidderContext) {
    const db = this.db;
    const [bidderRes, standingRes, wonRes, paidRes, leadingRes] =
      await Promise.all([
        db
          .from('auction_bidders')
          .select(
            'id, display_name, paddle_number, email_verified_at, phone_verified_at, card_status, card_brand, card_last4, exposure_limit_cents, blocked_at, sms_consent',
          )
          .eq('id', bidder.bidderId)
          .maybeSingle(),
        db
          .from('auction_proxy_bids')
          .select('max_amount_cents, item:auction_items!inner(status)')
          .eq('bidder_id', bidder.bidderId)
          .eq('item.status', 'open'),
        db
          .from('auction_items')
          .select('id, final_price_cents')
          .eq('winning_bidder_id', bidder.bidderId)
          .eq('status', 'sold'),
        db
          .from('auction_order_items')
          .select('item_id, order:auction_orders!inner(status, bidder_id)')
          .eq('order.bidder_id', bidder.bidderId)
          .eq('order.status', 'paid'),
        db
          .from('auction_items')
          .select('id, current_price_cents, ends_at')
          .eq('leader_bidder_id', bidder.bidderId)
          .eq('status', 'open'),
      ]);
    for (const res of [bidderRes, standingRes, wonRes, paidRes, leadingRes]) {
      if (res.error)
        this.unavailable('Bidder profile failed', res.error.message);
    }
    const row = bidderRes.data as {
      id: string;
      display_name: string;
      paddle_number: number | null;
      email_verified_at: string | null;
      phone_verified_at: string | null;
      card_status: string;
      card_brand: string | null;
      card_last4: string | null;
      exposure_limit_cents: number;
      blocked_at: string | null;
      sms_consent: boolean;
    } | null;
    if (!row) throw mapRpcFailure({ code: 'bidder_not_found' });

    const standing = (
      (standingRes.data ?? []) as Array<{ max_amount_cents: number }>
    ).reduce((sum, r) => sum + r.max_amount_cents, 0);
    const paidItemIds = new Set(
      ((paidRes.data ?? []) as Array<{ item_id: string | null }>).map(
        (r) => r.item_id,
      ),
    );
    const unpaidWins = (
      (wonRes.data ?? []) as Array<{
        id: string;
        final_price_cents: number | null;
      }>
    )
      .filter((r) => !paidItemIds.has(r.id))
      .reduce((sum, r) => sum + (r.final_price_cents ?? 0), 0);
    const committed = standing + unpaidWins;
    const verified =
      row.email_verified_at !== null && row.phone_verified_at !== null;

    return {
      bidder: {
        id: row.id,
        display_name: row.display_name,
        paddle_number: row.paddle_number,
        paddle_label: row.paddle_number ? `Bidder ${row.paddle_number}` : null,
        email_verified: row.email_verified_at !== null,
        phone_verified: row.phone_verified_at !== null,
        verified,
        card_status: row.card_status,
        card_brand: row.card_brand,
        card_last4: row.card_last4,
        sms_consent: row.sms_consent,
        blocked: row.blocked_at !== null,
        can_bid:
          verified && row.card_status === 'ready' && row.blocked_at === null,
      },
      // Approximate: the database enforces the real limit on every bid.
      exposure: {
        limit_cents: row.exposure_limit_cents,
        standing_bids_cents: standing,
        unpaid_wins_cents: unpaidWins,
        remaining_cents: Math.max(0, row.exposure_limit_cents - committed),
      },
      leading_items: (
        (leadingRes.data ?? []) as Array<{
          id: string;
          current_price_cents: number;
          ends_at: string | null;
        }>
      ).map((i) => ({
        id: i.id,
        current_price_cents: i.current_price_cents,
        ends_at: i.ends_at,
      })),
    };
  }

  async getOrders(bidder: BidderContext) {
    const { data, error } = await this.db
      .from('auction_orders')
      .select(
        'id, kind, status, auction_title, event_title, subtotal_cents, tax_cents, processing_fee_cents, platform_fee_cents, total_cents, paid_at, pay_by_at, created_at, items:auction_order_items(title, lot_number, quantity, price_cents)',
      )
      .eq('bidder_id', bidder.bidderId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) this.unavailable('Order list failed', error.message);
    type OrderRow = {
      id: string;
      kind: string;
      status: string;
      auction_title: string;
      event_title: string | null;
      subtotal_cents: number;
      tax_cents: number;
      processing_fee_cents: number;
      platform_fee_cents: number;
      total_cents: number;
      paid_at: string | null;
      pay_by_at: string;
      created_at: string;
      items: Array<{
        title: string;
        lot_number: number | null;
        quantity: number;
        price_cents: number;
      }> | null;
    };
    // Explicit whitelist: no Stripe ids, error text, attempts or fee internals.
    return {
      orders: ((data ?? []) as OrderRow[]).map((o) => ({
        id: o.id,
        kind: o.kind,
        status: o.status,
        auction_title: o.auction_title,
        event_title: o.event_title,
        subtotal_cents: o.subtotal_cents,
        tax_cents: o.tax_cents,
        processing_fee_cents: o.processing_fee_cents,
        platform_fee_cents: o.platform_fee_cents,
        total_cents: o.total_cents,
        paid_at: o.paid_at,
        pay_by_at: o.pay_by_at,
        created_at: o.created_at,
        items: (o.items ?? []).map((i) => ({
          title: i.title,
          lot_number: i.lot_number,
          quantity: i.quantity,
          price_cents: i.price_cents,
        })),
      })),
    };
  }
}
