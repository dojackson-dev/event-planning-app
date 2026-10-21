import { NONPROFIT_APP_FEE_RATE } from '../nonprofit/nonprofit-gate';
import { chargeTotalWithProcessing } from '../payments/platform-fee';
import type { AuctionBidKind, AuctionBidMode } from './auction.types';

/** Charged on top of the winning bid, with Stripe's processing fee. */
export const AUCTION_PLATFORM_FEE_RATE = NONPROFIT_APP_FEE_RATE;
export const AUCTION_DEFAULT_EXPOSURE_LIMIT_CENTS = 500_000;
export const AUCTION_PAYMENT_GRACE_HOURS = 72;
export const AUCTION_ANTI_SNIPE_WINDOW_SECONDS = 300;
export const AUCTION_ANTI_SNIPE_EXTENSION_SECONDS = 300;
export const AUCTION_MAX_BID_CENTS = 10_000_000;

// Keep in sync with auction_bid_increment() in create-auction-functions.sql.
export const BID_INCREMENT_TIERS: ReadonlyArray<{
  belowCents: number;
  incrementCents: number;
}> = [
  { belowCents: 2_500, incrementCents: 100 },
  { belowCents: 5_000, incrementCents: 250 },
  { belowCents: 10_000, incrementCents: 500 },
  { belowCents: 25_000, incrementCents: 1_000 },
  { belowCents: 50_000, incrementCents: 2_500 },
  { belowCents: 100_000, incrementCents: 5_000 },
];
const TOP_TIER_INCREMENT_CENTS = 10_000;

/** Increment above `priceCents`; a positive per-item override wins over the tiers. */
export function bidIncrementCents(
  priceCents: number,
  overrideCents?: number | null,
): number {
  if (overrideCents != null && overrideCents > 0) return overrideCents;
  const tier = BID_INCREMENT_TIERS.find((t) => priceCents < t.belowCents);
  return tier ? tier.incrementCents : TOP_TIER_INCREMENT_CENTS;
}

export interface ItemBidState {
  currentPriceCents: number;
  bidCount: number;
  startingBidCents: number;
  incrementOverrideCents?: number | null;
}

/** Lowest amount a non-leading bidder may bid. */
export function minNextBidCents(item: ItemBidState): number {
  if (item.bidCount === 0) return item.startingBidCents;
  return (
    item.currentPriceCents +
    bidIncrementCents(item.currentPriceCents, item.incrementOverrideCents)
  );
}

/** Buy-it-now disappears once the first bid lands. */
export function isBuyNowAvailable(item: {
  buyNowCents: number | null;
  bidCount: number;
}): boolean {
  return (
    item.buyNowCents != null && item.buyNowCents > 0 && item.bidCount === 0
  );
}

export interface ProxyItemState extends ItemBidState {
  leaderBidderId: string | null;
  /** The leader's standing max; falls back to the current price when unknown. */
  leaderMaxCents?: number | null;
}

export interface ProxyBidInput {
  bidderId: string;
  amountCents: number;
  mode: AuctionBidMode;
  /** The bidder's existing max on this item, if any. */
  ownMaxCents?: number | null;
}

export interface ProxyBidRow {
  bidderId: string;
  amountCents: number;
  maxAmountCents: number;
  kind: AuctionBidKind;
}

export interface ProxyBidAccepted {
  ok: true;
  outcome: 'leading' | 'outbid' | 'max_raised';
  priceCents: number;
  leaderBidderId: string;
  leaderMaxCents: number;
  leaderChanged: boolean;
  /** Previous leader to notify; set only when the leader changed. */
  outbidBidderId: string | null;
  /** auction_bids rows to write, in order. */
  bids: ProxyBidRow[];
}

export interface ProxyBidRejected {
  ok: false;
  code: 'invalid_amount' | 'max_not_raised' | 'bid_too_low';
  minNextBidCents: number;
}

export type ProxyBidResult = ProxyBidAccepted | ProxyBidRejected;

/**
 * Mirrors the algorithm documented at the top of place_auction_bid in
 * create-auction-functions.sql. The incumbent leader holds the earliest max,
 * so a tie always goes to the leader.
 */
export function resolveProxyBid(
  item: ProxyItemState,
  bid: ProxyBidInput,
): ProxyBidResult {
  const { bidderId, amountCents, mode } = bid;
  const minNext = minNextBidCents(item);
  const reject = (code: ProxyBidRejected['code']): ProxyBidRejected => ({
    ok: false,
    code,
    minNextBidCents: minNext,
  });
  const inc = (price: number) =>
    bidIncrementCents(price, item.incrementOverrideCents);

  if (
    !Number.isInteger(amountCents) ||
    amountCents <= 0 ||
    amountCents > AUCTION_MAX_BID_CENTS
  ) {
    return reject('invalid_amount');
  }
  if (amountCents <= (bid.ownMaxCents ?? 0)) return reject('max_not_raised');

  const leaderId = item.leaderBidderId;
  if (leaderId === bidderId) {
    return {
      ok: true,
      outcome: 'max_raised',
      priceCents: item.currentPriceCents,
      leaderBidderId: bidderId,
      leaderMaxCents: amountCents,
      leaderChanged: false,
      outbidBidderId: null,
      bids: [],
    };
  }

  if (amountCents < minNext) return reject('bid_too_low');

  if (leaderId === null) {
    const priceCents = mode === 'manual' ? amountCents : item.startingBidCents;
    return {
      ok: true,
      outcome: 'leading',
      priceCents,
      leaderBidderId: bidderId,
      leaderMaxCents: amountCents,
      leaderChanged: true,
      outbidBidderId: null,
      bids: [
        {
          bidderId,
          amountCents: priceCents,
          maxAmountCents: amountCents,
          kind: 'manual',
        },
      ],
    };
  }

  const leaderMax = item.leaderMaxCents ?? item.currentPriceCents;

  if (amountCents > leaderMax) {
    const bids: ProxyBidRow[] = [];
    if (leaderMax > item.currentPriceCents) {
      bids.push({
        bidderId: leaderId,
        amountCents: leaderMax,
        maxAmountCents: leaderMax,
        kind: 'proxy_auto',
      });
    }
    const priceCents =
      mode === 'manual'
        ? amountCents
        : Math.min(amountCents, leaderMax + inc(leaderMax));
    bids.push({
      bidderId,
      amountCents: priceCents,
      maxAmountCents: amountCents,
      kind: 'manual',
    });
    return {
      ok: true,
      outcome: 'leading',
      priceCents,
      leaderBidderId: bidderId,
      leaderMaxCents: amountCents,
      leaderChanged: true,
      outbidBidderId: leaderId,
      bids,
    };
  }

  const priceCents = Math.min(leaderMax, amountCents + inc(amountCents));
  return {
    ok: true,
    outcome: 'outbid',
    priceCents,
    leaderBidderId: leaderId,
    leaderMaxCents: leaderMax,
    leaderChanged: false,
    outbidBidderId: null,
    bids: [
      {
        bidderId,
        amountCents,
        maxAmountCents: amountCents,
        kind: 'manual',
      },
      {
        bidderId: leaderId,
        amountCents: priceCents,
        maxAmountCents: leaderMax,
        kind: 'proxy_auto',
      },
    ],
  };
}

export interface OrderAmounts {
  platformFeeCents: number;
  processingFeeCents: number;
  taxCents: number;
  totalCents: number;
  applicationFeeCents: number;
  recipientNetCents: number;
}

/**
 * The buyer pays subtotal + tax + platform fee + a processing fee that covers
 * Stripe's bill on the whole charge. The application fee is everything but the
 * subtotal (platform fee + processing + tax), so the non-profit nets exactly
 * the subtotal and the platform keeps the tax to remit.
 */
export function computeOrderAmounts(input: {
  subtotalCents: number;
  taxCents: number;
  rate: number;
}): OrderAmounts {
  const { subtotalCents, taxCents, rate } = input;
  if (!Number.isInteger(subtotalCents) || subtotalCents <= 0) {
    throw new RangeError('subtotalCents must be a positive integer');
  }
  if (!Number.isInteger(taxCents) || taxCents < 0) {
    throw new RangeError('taxCents must be a non-negative integer');
  }
  if (!Number.isFinite(rate) || rate < 0 || rate > 0.2) {
    throw new RangeError('rate must be between 0 and 0.2');
  }

  const platformFeeCents = Math.round(subtotalCents * rate);
  const beforeProcessing = subtotalCents + taxCents + platformFeeCents;
  const totalCents = chargeTotalWithProcessing(beforeProcessing);
  const processingFeeCents = totalCents - beforeProcessing;
  const applicationFeeCents = platformFeeCents + processingFeeCents + taxCents;

  return {
    platformFeeCents,
    processingFeeCents,
    taxCents,
    totalCents,
    applicationFeeCents,
    recipientNetCents: totalCents - applicationFeeCents,
  };
}

/**
 * End time after a bid at `now`: inside the window the end moves to
 * now + extension, never later than `hardCloseAt` and never earlier than before.
 */
export function antiSnipeEndsAt(input: {
  now: Date;
  endsAt: Date;
  windowSeconds: number;
  extensionSeconds: number;
  hardCloseAt?: Date | null;
}): Date {
  const { now, endsAt, windowSeconds, extensionSeconds, hardCloseAt } = input;
  if (extensionSeconds <= 0) return endsAt;
  const nowMs = now.getTime();
  const endMs = endsAt.getTime();
  if (nowMs >= endMs || nowMs < endMs - windowSeconds * 1000) return endsAt;

  const candidateMs = nowMs + extensionSeconds * 1000;
  const capMs = hardCloseAt ? hardCloseAt.getTime() : Infinity;
  const newEndMs = Math.max(endMs, Math.min(candidateMs, capMs));
  return newEndMs === endMs ? endsAt : new Date(newEndMs);
}
