// Shared types and helpers for the promoter auction screens. Money is integer cents on the wire.

export type AuctionStatus = 'draft' | 'scheduled' | 'live' | 'closed' | 'settled' | 'cancelled'
export type ItemStatus = 'open' | 'sold' | 'unsold' | 'reserve_not_met' | 'withdrawn'
export type SaleMode = 'auction' | 'fixed'
export type OrderStatus = 'pending' | 'charging' | 'requires_action' | 'failed' | 'paid' | 'defaulted' | 'cancelled' | 'refunded'

export interface Auction {
  id: string
  title: string
  description: string | null
  status: AuctionStatus
  public_event_id: string | null
  event_title: string | null
  event_date: string | null
  starts_at: string | null
  ends_at: string | null
  hard_close_at: string | null
  anti_snipe_window_seconds: number
  anti_snipe_extension_seconds: number
  payment_grace_hours: number
  default_exposure_limit_cents: number
  org_name: string | null
  created_at: string
  item_count?: number
}

export interface AuctionItem {
  id: string
  auction_id: string
  lot_number: number | null
  sale_mode: SaleMode
  title: string
  description: string | null
  category: string | null
  donor_name: string | null
  image_urls: string[]
  fair_market_value_cents: number
  tax_code: string | null
  sort_order: number
  starting_bid_cents: number | null
  reserve_cents: number | null
  increment_cents: number | null
  buy_now_cents: number | null
  buy_now_available: boolean
  fixed_price_cents: number | null
  quantity: number
  quantity_sold: number
  per_bidder_limit: number | null
  status: ItemStatus
  current_price_cents: number
  bid_count: number
  final_price_cents: number | null
  sold_via: 'auction' | 'buy_now' | null
}

export interface AuctionDetail extends Auction {
  items: AuctionItem[]
}

export interface AuctionSummary {
  auction: { id: string; title: string; status: AuctionStatus; starts_at: string | null; ends_at: string | null }
  items: Record<string, number>
  bids: { total: number }
  bidders: { registered: number; card_ready: number; blocked: number }
  orders: Record<string, number>
  revenue: {
    hammer_total_cents: number
    fixed_sales_cents: number
    paid_cents: number
    paid_subtotal_cents: number
    outstanding_cents: number
    defaulted_cents: number
  }
  reserve_pending: Array<{
    item_id: string
    title: string
    lot_number: number | null
    top_bid_cents: number
    reserve_cents: number | null
  }>
}

export interface BidRow {
  id: number
  created_at: string
  kind: 'manual' | 'proxy_auto'
  amount_cents: number
  item_id: string
  item_title: string | null
  lot_number: number | null
  bidder_id: string
  paddle_number: number | null
  bidder_name: string | null
  bidder_email: string | null
  bidder_phone: string | null
}

export interface BidderRow {
  id: string
  paddle_number: number | null
  display_name: string
  email: string
  phone_e164: string
  email_verified_at: string | null
  phone_verified_at: string | null
  card_status: 'none' | 'pending' | 'ready' | 'failed'
  card_brand: string | null
  card_last4: string | null
  exposure_limit_cents: number
  blocked: boolean
  blocked_at: string | null
  blocked_reason: string | null
  created_at: string
}

export interface OrderLine {
  id: string
  title: string
  lot_number: number | null
  sale_mode: SaleMode
  quantity: number
  price_cents: number
}

export interface OrderRow {
  id: string
  bidder_id: string | null
  kind: 'settlement' | 'buy_now'
  status: OrderStatus
  buyer_name: string
  buyer_email: string
  buyer_phone: string | null
  subtotal_cents: number
  tax_cents: number
  processing_fee_cents: number
  platform_fee_cents: number
  total_cents: number
  amount_received_cents: number | null
  paid_at: string | null
  pay_by_at: string
  charge_attempts: number
  last_error_code: string | null
  created_at: string
  items: OrderLine[]
}

export const AUCTION_STATUS_LABEL: Record<AuctionStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  live: 'Live',
  closed: 'Closed',
  settled: 'Settled',
  cancelled: 'Cancelled',
}

export const AUCTION_STATUS_STYLE: Record<AuctionStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  scheduled: 'bg-blue-100 text-blue-700',
  live: 'bg-green-100 text-green-700',
  closed: 'bg-amber-100 text-amber-700',
  settled: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-700',
}

export const ITEM_STATUS_LABEL: Record<ItemStatus, string> = {
  open: 'Open',
  sold: 'Sold',
  unsold: 'Unsold',
  reserve_not_met: 'Reserve not met',
  withdrawn: 'Withdrawn',
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  charging: 'Charging',
  requires_action: 'Needs customer action',
  failed: 'Charge failed',
  paid: 'Paid',
  defaulted: 'Defaulted',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

export const ORDER_STATUS_STYLE: Record<OrderStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  charging: 'bg-blue-100 text-blue-700',
  requires_action: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  defaulted: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  refunded: 'bg-purple-100 text-purple-700',
}

/** Statuses the backend lets the promoter edit; closed, settled and cancelled auctions are read-only. */
export const EDITABLE_AUCTION_STATUSES: AuctionStatus[] = ['draft', 'scheduled', 'live']
export const UNPAID_ORDER_STATUSES: OrderStatus[] = ['pending', 'failed', 'requires_action', 'defaulted']
export const RETRYABLE_ORDER_STATUSES: OrderStatus[] = ['failed', 'requires_action']

export function formatUsd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '-'
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/** Dollar text from a form field to integer cents; null when blank or invalid. */
export function dollarsToCents(text: string): number | null {
  const cleaned = text.replace(/[$,\s]/g, '')
  if (cleaned === '') return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

export function centsToDollars(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return (cents / 100).toFixed(2)
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
}

/** ISO string to the value format of an <input type="datetime-local"> in the viewer's timezone. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function localInputToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function timezoneLabel(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'local time'
  }
}

/** Readable message from an axios error; the backend returns { message } as a string or list. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
  const message = data?.message
  if (Array.isArray(message)) return message.join(' ')
  if (typeof message === 'string' && message) return message
  return fallback
}

export function httpStatus(err: unknown): number | undefined {
  return (err as { response?: { status?: number } })?.response?.status
}
