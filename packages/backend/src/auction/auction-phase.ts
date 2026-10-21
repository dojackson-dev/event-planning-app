export const AUCTION_PHASES = [
  'accepting_donations',
  'preview',
  'bidding_open',
  'closed',
  'upcoming',
] as const;
export type AuctionPhase = (typeof AUCTION_PHASES)[number];

export interface PhaseInput {
  status: string;
  accepts_donations?: boolean | null;
  donations_close_at?: string | null;
  /** At least one publicly visible (non-withdrawn) item exists. */
  hasVisibleItems: boolean;
}

/** Statuses that were always public once the auction is published. */
const ALWAYS_VISIBLE_STATUSES = ['scheduled', 'live', 'closed', 'settled'];
const CLOSED_STATUSES = ['closed', 'settled', 'cancelled'];

/**
 * An auction is publicly visible once published (scheduled/live/closed/settled), or earlier when the
 * organizer turned its page on. Cancelled auctions are never visible.
 */
export function isPubliclyVisible(auction: {
  status: string;
  page_published?: boolean | null;
}): boolean {
  if (auction.status === 'cancelled') return false;
  return (
    ALWAYS_VISIBLE_STATUSES.includes(auction.status) ||
    auction.page_published === true
  );
}

/** Visitor-facing phase; bidding is only possible in `bidding_open` (status = live). */
export function computeAuctionPhase(
  input: PhaseInput,
  now: Date = new Date(),
): AuctionPhase {
  if (CLOSED_STATUSES.includes(input.status)) return 'closed';
  if (input.status === 'live') return 'bidding_open';
  if (input.status === 'draft' || input.status === 'scheduled') {
    if (isDonationWindowOpen(input, now)) return 'accepting_donations';
    return input.hasVisibleItems ? 'preview' : 'upcoming';
  }
  return 'upcoming';
}

function isDonationWindowOpen(
  input: Pick<PhaseInput, 'accepts_donations' | 'donations_close_at'>,
  now: Date,
): boolean {
  if (input.accepts_donations !== true) return false;
  if (!input.donations_close_at) return true;
  return now.getTime() < new Date(input.donations_close_at).getTime();
}
