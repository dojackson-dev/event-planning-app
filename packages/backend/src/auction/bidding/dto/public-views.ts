import { computeAuctionPhase } from '../../auction-phase';
import type { AuctionPhase } from '../../auction-phase';
import type { AuctionFulfillmentMethod } from '../../auction.types';
import { minNextBidCents } from '../../auction-money';

/**
 * Columns the public service reads; reserve_cents/leader_bidder_id/final_price_cents are inputs only and never emitted.
 * The *_BASE sets predate the organization-pages migration; the service falls back to them until it is applied.
 */
export const PUBLIC_ITEM_COLUMNS_BASE =
  'id, auction_id, lot_number, sale_mode, title, description, category, donor_name, image_urls, fair_market_value_cents, sort_order, starting_bid_cents, reserve_cents, increment_cents, buy_now_cents, buy_now_available, fixed_price_cents, quantity, quantity_sold, per_bidder_limit, status, current_price_cents, leader_bidder_id, bid_count, ends_at, final_price_cents';

/** source_donation_id and donor contact details are deliberately not selected. */
export const PUBLIC_ITEM_COLUMNS = `${PUBLIC_ITEM_COLUMNS_BASE}, condition, specifications, whats_included, restrictions, expires_on, fulfillment_method, fulfillment_details, is_experience, scheduling_requirements, blackout_dates, donor_business, donor_recognition`;

export const PUBLIC_AUCTION_COLUMNS_BASE =
  'id, title, description, status, starts_at, ends_at, org_name, event_title, event_date, public_event_id';

export const PUBLIC_AUCTION_COLUMNS = `${PUBLIC_AUCTION_COLUMNS_BASE}, organization_id, slug, cover_image_url, accepts_donations, donations_close_at, page_published, organization:auction_organizations(slug, is_published)`;

export interface PublicItemSource {
  id: string;
  auction_id: string;
  lot_number: number | null;
  sale_mode: 'auction' | 'fixed';
  title: string;
  description: string | null;
  category: string | null;
  donor_name: string | null;
  image_urls: string[] | null;
  fair_market_value_cents: number;
  sort_order: number;
  starting_bid_cents: number | null;
  reserve_cents: number | null;
  increment_cents: number | null;
  buy_now_cents: number | null;
  buy_now_available: boolean;
  fixed_price_cents: number | null;
  quantity: number;
  quantity_sold: number;
  per_bidder_limit: number | null;
  status: string;
  current_price_cents: number;
  leader_bidder_id: string | null;
  bid_count: number;
  ends_at: string | null;
  final_price_cents?: number | null;
  condition?: string | null;
  specifications?: string | null;
  whats_included?: string | null;
  restrictions?: string | null;
  expires_on?: string | null;
  fulfillment_method?: AuctionFulfillmentMethod | null;
  fulfillment_details?: string | null;
  is_experience?: boolean;
  scheduling_requirements?: string | null;
  blackout_dates?: string | null;
  donor_business?: string | null;
  donor_recognition?: boolean;
}

export interface PublicItemState {
  id: string;
  status: string;
  current_price_cents: number;
  bid_count: number;
  ends_at: string | null;
  min_next_bid_cents: number | null;
  reserve_met: boolean;
  buy_now_available: boolean;
  quantity_remaining: number | null;
}

export interface PublicItemSummary extends PublicItemState {
  auction_id: string;
  lot_number: number | null;
  sale_mode: 'auction' | 'fixed';
  title: string;
  description: string | null;
  category: string | null;
  donor_name: string | null;
  image_urls: string[];
  fair_market_value_cents: number;
  starting_bid_cents: number | null;
  buy_now_cents: number | null;
  fixed_price_cents: number | null;
  per_bidder_limit: number | null;
  condition: string | null;
  specifications: string | null;
  whats_included: string | null;
  restrictions: string | null;
  expires_on: string | null;
  fulfillment_method: AuctionFulfillmentMethod | null;
  fulfillment_details: string | null;
  is_experience: boolean;
  scheduling_requirements: string | null;
  blackout_dates: string | null;
  /** Null unless the donor agreed to be recognised. */
  donor_business: string | null;
}

export interface PublicAuctionSource {
  id: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  org_name: string | null;
  event_title: string | null;
  event_date: string | null;
  public_event_id: string | null;
  organization_id?: string | null;
  slug?: string | null;
  cover_image_url?: string | null;
  accepts_donations?: boolean;
  donations_close_at?: string | null;
  page_published?: boolean;
  organization?: { slug: string; is_published: boolean } | null;
}

export interface PublicAuction {
  id: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  org_name: string | null;
  event_title: string | null;
  event_date: string | null;
  public_event_id: string | null;
  slug: string | null;
  cover_image_url: string | null;
  phase: AuctionPhase;
  accepts_donations: boolean;
  donations_close_at: string | null;
  /** Null when the auction has no published organization page. */
  org_slug: string | null;
}

/** Only the bidder-visible state: leader identity and reserve amount stay server-side. */
export function toPublicItemState(
  row: PublicItemSource,
  auctionEndsAt: string | null = null,
): PublicItemState {
  const open = row.status === 'open';
  const isAuction = row.sale_mode === 'auction';
  const noBids = row.bid_count === 0;
  return {
    id: row.id,
    status: row.status,
    current_price_cents: row.current_price_cents,
    bid_count: row.bid_count,
    ends_at: row.ends_at ?? auctionEndsAt,
    min_next_bid_cents:
      open && isAuction && row.starting_bid_cents != null
        ? minNextBidCents({
            currentPriceCents: row.current_price_cents,
            bidCount: row.bid_count,
            startingBidCents: row.starting_bid_cents,
            incrementOverrideCents: row.increment_cents,
          })
        : null,
    reserve_met:
      row.reserve_cents == null ||
      (!noBids && row.current_price_cents >= row.reserve_cents),
    buy_now_available:
      open &&
      isAuction &&
      row.buy_now_available &&
      row.buy_now_cents != null &&
      noBids,
    quantity_remaining: isAuction
      ? null
      : Math.max(0, row.quantity - row.quantity_sold),
  };
}

export function toPublicItemSummary(
  row: PublicItemSource,
  auctionEndsAt: string | null = null,
): PublicItemSummary {
  const state = toPublicItemState(row, auctionEndsAt);
  // Donor attribution is shown only when the donor agreed to be recognised.
  const recognised = row.donor_recognition === true;
  return {
    ...state,
    auction_id: row.auction_id,
    lot_number: row.lot_number,
    sale_mode: row.sale_mode,
    title: row.title,
    description: row.description,
    category: row.category,
    donor_name: recognised ? row.donor_name : null,
    image_urls: row.image_urls ?? [],
    fair_market_value_cents: row.fair_market_value_cents,
    starting_bid_cents: row.starting_bid_cents,
    buy_now_cents: state.buy_now_available ? row.buy_now_cents : null,
    fixed_price_cents: row.fixed_price_cents,
    per_bidder_limit: row.per_bidder_limit,
    condition: row.condition ?? null,
    specifications: row.specifications ?? null,
    whats_included: row.whats_included ?? null,
    restrictions: row.restrictions ?? null,
    expires_on: row.expires_on ?? null,
    fulfillment_method: row.fulfillment_method ?? null,
    fulfillment_details: row.fulfillment_details ?? null,
    is_experience: row.is_experience === true,
    scheduling_requirements: row.scheduling_requirements ?? null,
    blackout_dates: row.blackout_dates ?? null,
    donor_business: recognised ? (row.donor_business ?? null) : null,
  };
}

/** `itemCount` (publicly visible items) feeds the visitor-facing phase. */
export function toPublicAuction(
  row: PublicAuctionSource,
  itemCount = 0,
  now: Date = new Date(),
): PublicAuction {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    org_name: row.org_name,
    event_title: row.event_title,
    event_date: row.event_date,
    public_event_id: row.public_event_id,
    slug: row.slug ?? null,
    cover_image_url: row.cover_image_url ?? null,
    phase: computeAuctionPhase(
      {
        status: row.status,
        accepts_donations: row.accepts_donations,
        donations_close_at: row.donations_close_at,
        hasVisibleItems: itemCount > 0,
      },
      now,
    ),
    accepts_donations: row.accepts_donations === true,
    donations_close_at: row.donations_close_at ?? null,
    org_slug: row.organization?.is_published ? row.organization.slug : null,
  };
}

export interface BidFeedSource {
  id: number;
  amount_cents: number;
  created_at: string;
  bidder?: { paddle_number: number | null } | null;
}

export interface BidFeedEntry {
  id: number;
  bidder_label: string;
  amount_cents: number;
  created_at: string;
}

/** Paddle label only; never the bidder id, name, contact details or standing max. */
export function toBidFeedEntry(row: BidFeedSource): BidFeedEntry {
  const paddle = row.bidder?.paddle_number;
  return {
    id: row.id,
    bidder_label: paddle ? `Bidder ${paddle}` : 'Bidder',
    amount_cents: row.amount_cents,
    created_at: row.created_at,
  };
}
