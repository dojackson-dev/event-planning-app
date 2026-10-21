import type { AuctionPhase } from '@/lib/auctionApi'

export const PHASE_LABELS: Record<AuctionPhase, string> = {
  accepting_donations: 'Accepting Item Donations',
  preview: 'Preview Items',
  bidding_open: 'Bidding Open',
  closed: 'Auction Closed',
  upcoming: 'Coming Soon',
}

export const PHASE_STYLES: Record<AuctionPhase, string> = {
  accepting_donations: 'bg-purple-100 text-purple-800',
  preview: 'bg-blue-100 text-blue-800',
  bidding_open: 'bg-green-100 text-green-800',
  closed: 'bg-gray-200 text-gray-700',
  upcoming: 'bg-amber-100 text-amber-800',
}

const KNOWN = new Set<string>(Object.keys(PHASE_LABELS))

export function isPhase(value: unknown): value is AuctionPhase {
  return typeof value === 'string' && KNOWN.has(value)
}

/**
 * Prefers the server-computed phase. The fallback only covers older API responses and is display-only:
 * the server alone decides whether bidding is possible.
 */
export function resolvePhase(opts: { phase?: unknown; status?: string | null; hasItems?: boolean }): AuctionPhase {
  if (isPhase(opts.phase)) return opts.phase
  switch (opts.status) {
    case 'live':
      return 'bidding_open'
    case 'closed':
    case 'settled':
    case 'cancelled':
      return 'closed'
    case 'scheduled':
      return opts.hasItems ? 'preview' : 'upcoming'
    default:
      return 'upcoming'
  }
}

/** Short explanation shown wherever bidding controls would otherwise appear. */
export function phaseMessage(phase: AuctionPhase, startsAt?: string | null): string {
  switch (phase) {
    case 'accepting_donations':
      return 'This auction is still collecting item donations. Bidding is not open yet.'
    case 'preview':
      return `You can preview the items now. Bidding is not open yet${startsAt ? ` and is scheduled to open ${new Date(startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` : ''}.`
    case 'upcoming':
      return 'This auction is coming soon. Bidding is not open yet.'
    case 'closed':
      return 'This auction has closed. Bidding is no longer available.'
    default:
      return ''
  }
}
