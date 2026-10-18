import axios, { AxiosError } from 'axios'

/**
 * Dedicated client for the public bidder API. This deliberately does not use `@/lib/api`:
 * that instance redirects to the site login on 401, which is wrong for anonymous bidders.
 * Bidder sessions are per auction and sent in the `x-auction-token` header.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const auctionApi = axios.create({
  baseURL: `${API_URL}/auctions/public`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

// ---- bidder session (per auction) ----

const tokenKey = (auctionId: string) => `auction_token:${auctionId}`

export function getBidderToken(auctionId: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(tokenKey(auctionId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token?: string; expiresAt?: string }
    if (!parsed.token) return null
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
      window.localStorage.removeItem(tokenKey(auctionId))
      return null
    }
    return parsed.token
  } catch {
    return null
  }
}

export function setBidderToken(auctionId: string, token: string, expiresAt?: string) {
  window.localStorage.setItem(tokenKey(auctionId), JSON.stringify({ token, expiresAt }))
}

export function clearBidderToken(auctionId: string) {
  if (typeof window !== 'undefined') window.localStorage.removeItem(tokenKey(auctionId))
}

export function bidderHeaders(auctionId: string): Record<string, string> {
  const token = getBidderToken(auctionId)
  return token ? { 'x-auction-token': token } : {}
}

// ---- errors ----

export interface ApiFailure {
  status: number | null
  code: string | null
  message: string
  data: Record<string, unknown>
}

/** Normalises the backend's `{ statusCode, code, message, ...extra }` error body. */
export function parseApiError(err: unknown, fallback = 'Something went wrong. Please try again.'): ApiFailure {
  const axiosErr = err as AxiosError<{ code?: string; message?: string | string[] } & Record<string, unknown>>
  const status = axiosErr?.response?.status ?? null
  const data = (axiosErr?.response?.data ?? {}) as Record<string, unknown>
  const rawMessage = data.message
  let message = Array.isArray(rawMessage) ? rawMessage.join(' ') : typeof rawMessage === 'string' ? rawMessage : ''
  if (!message) {
    if (status === null) message = 'Could not reach the server. Check your connection and try again.'
    else if (status === 429) message = 'Too many requests. Please wait a moment and try again.'
    else message = fallback
  }
  return { status, code: typeof data.code === 'string' ? data.code : null, message, data }
}

// ---- response types (mirror packages/backend/src/auction/bidding/dto/public-views.ts) ----

export type AuctionStatus = 'scheduled' | 'live' | 'closed' | 'settled'
export type ItemStatus = 'open' | 'sold' | 'unsold' | 'reserve_not_met'

export interface PublicAuction {
  id: string
  title: string
  description: string | null
  status: string
  starts_at: string | null
  ends_at: string | null
  org_name: string | null
  event_title: string | null
  event_date: string | null
  public_event_id: string | null
}

export interface PublicItem {
  id: string
  auction_id: string
  lot_number: number | null
  sale_mode: 'auction' | 'fixed'
  title: string
  description: string | null
  category: string | null
  donor_name: string | null
  image_urls: string[]
  fair_market_value_cents: number
  starting_bid_cents: number | null
  buy_now_cents: number | null
  fixed_price_cents: number | null
  per_bidder_limit: number | null
  status: string
  current_price_cents: number
  bid_count: number
  ends_at: string | null
  min_next_bid_cents: number | null
  reserve_met: boolean
  buy_now_available: boolean
  quantity_remaining: number | null
}

export interface ItemState {
  id: string
  status: string
  current_price_cents: number
  bid_count: number
  ends_at: string | null
  min_next_bid_cents: number | null
  reserve_met: boolean
  buy_now_available: boolean
  quantity_remaining: number | null
  you_are_leading?: boolean
}

export interface AuctionStateResponse {
  now: string
  auction: { id: string; status: string; starts_at: string | null; ends_at: string | null }
  items: ItemState[]
}

export interface BidFeedEntry {
  id: number
  bidder_label: string
  amount_cents: number
  created_at: string
}

export interface BidderMe {
  bidder: {
    id: string
    display_name: string
    paddle_number: number | null
    paddle_label: string | null
    email_verified: boolean
    phone_verified: boolean
    verified: boolean
    card_status: 'none' | 'pending' | 'ready' | 'failed'
    card_brand: string | null
    card_last4: string | null
    sms_consent: boolean
    blocked: boolean
    can_bid: boolean
  }
  exposure: { limit_cents: number; standing_bids_cents: number; unpaid_wins_cents: number; remaining_cents: number }
  leading_items: Array<{ id: string; current_price_cents: number; ends_at: string | null }>
}

export interface BidderOrder {
  id: string
  kind: string
  status: string
  auction_title: string
  event_title: string | null
  subtotal_cents: number
  tax_cents: number
  processing_fee_cents: number
  platform_fee_cents: number
  total_cents: number
  paid_at: string | null
  pay_by_at: string
  created_at: string
  items: Array<{ title: string; lot_number: number | null; quantity: number; price_cents: number }>
}

export interface PlaceBidResponse {
  ok: true
  outcome: 'leading' | 'outbid' | 'max_raised'
  current_price_cents: number
  you_are_leading: boolean
  your_max_cents: number | null
  min_next_bid_cents: number | null
  bid_count: number
  ends_at: string | null
  extended: boolean
  reserve_met: boolean
  buy_now_available: boolean
}

export interface ChargeResult {
  orderId: string
  status: 'paid' | 'failed' | 'requires_action' | 'pending' | 'skipped'
  payUrl?: string
  message?: string
}

export interface PaySummary {
  auctionTitle: string
  organization: string | null
  firstName: string
  maskedEmail: string
  status: string
  payable: boolean
  paid: boolean
  payBy: string
  items: Array<{ title: string; quantity: number; priceCents: number }>
  subtotalCents: number
  amounts: { taxCents: number; processingFeeCents: number; platformFeeCents: number; totalCents: number } | null
}

/** True when the API says the feature is switched off (every public route 404s). */
export function isUnavailable(err: unknown): boolean {
  return parseApiError(err).status === 404
}
