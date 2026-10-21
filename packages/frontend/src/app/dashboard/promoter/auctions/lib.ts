import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { compressImage } from '@/lib/compressImage'

// Shared types and helpers for the promoter auction screens. Money is integer cents on the wire.

export type AuctionStatus = 'draft' | 'scheduled' | 'live' | 'closed' | 'settled' | 'cancelled'
export type ItemStatus = 'open' | 'sold' | 'unsold' | 'reserve_not_met' | 'withdrawn'
export type SaleMode = 'auction' | 'fixed'
export type AuctionPhase = 'accepting_donations' | 'preview' | 'bidding_open' | 'closed' | 'upcoming'
export type FulfillmentMethod = 'pickup' | 'delivery' | 'shipping' | 'digital' | 'arranged_with_donor'
export type DonationStatus = 'pending' | 'approved' | 'declined'
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
  // Organization-page fields; absent on old backends.
  organization_id?: string | null
  slug?: string | null
  cover_image_url?: string | null
  accepts_donations?: boolean
  donations_close_at?: string | null
  page_published?: boolean
  phase?: AuctionPhase
  org_slug?: string | null
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
  condition?: string | null
  specifications?: string | null
  whats_included?: string | null
  restrictions?: string | null
  expires_on?: string | null
  fulfillment_method?: FulfillmentMethod | null
  fulfillment_details?: string | null
  is_experience?: boolean
  scheduling_requirements?: string | null
  blackout_dates?: string | null
  donor_business?: string | null
  donor_recognition?: boolean
  source_donation_id?: string | null
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

export const FULFILLMENT_LABEL: Record<FulfillmentMethod, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  shipping: 'Shipping',
  digital: 'Digital / e-gift',
  arranged_with_donor: 'Arranged with donor',
}

export const PHASE_LABEL: Record<AuctionPhase, string> = {
  accepting_donations: 'Accepting Item Donations',
  preview: 'Preview Items',
  bidding_open: 'Bidding Open',
  closed: 'Auction Closed',
  upcoming: 'Coming Soon',
}

export const PHASE_STYLE: Record<AuctionPhase, string> = {
  accepting_donations: 'bg-teal-100 text-teal-700',
  preview: 'bg-sky-100 text-sky-700',
  bidding_open: 'bg-green-100 text-green-700',
  closed: 'bg-amber-100 text-amber-700',
  upcoming: 'bg-gray-100 text-gray-700',
}

/** Same rules as the server's public phase; null when the page is not public at all. */
export function auctionPhase(a: Auction, itemCount?: number, now: Date = new Date()): AuctionPhase | null {
  const isPublic = (['scheduled', 'live', 'closed', 'settled'] as AuctionStatus[]).includes(a.status) || (a.page_published === true && a.status !== 'cancelled')
  if (!isPublic) return null
  if (['closed', 'settled', 'cancelled'].includes(a.status)) return 'closed'
  if (a.status === 'live') return 'bidding_open'
  const closeAt = a.donations_close_at ? new Date(a.donations_close_at) : null
  if (a.accepts_donations && (!closeAt || now < closeAt)) return 'accepting_donations'
  if ((itemCount ?? a.item_count ?? 0) > 0) return 'preview'
  return 'upcoming'
}

/** Canonical public origin used only for display and copy; the real route is relative. */
export const PUBLIC_SITE_ORIGIN = 'https://eventecos.com'

/** Origin of the site the organizer is on (demo vs production), so copied links point at the same environment. */
export function usePublicOrigin(): string {
  const [origin, setOrigin] = useState(PUBLIC_SITE_ORIGIN)
  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])
  return origin
}

export function publicAuctionPath(a: Pick<Auction, 'id' | 'slug' | 'org_slug'>, orgSlug?: string | null): string {
  const org = a.org_slug || orgSlug
  return org && a.slug ? `/auctions/${org}/${a.slug}` : `/auctions/${a.id}`
}

export function donationPath(a: Pick<Auction, 'id' | 'slug' | 'org_slug'>, orgSlug?: string | null): string {
  return `${publicAuctionPath(a, orgSlug)}/donate`
}

export const RESERVED_SLUGS = ['items', 'register', 'login', 'my-bids', 'pay', 'donate', 'o', 'new', 'admin', 'api', 'manage']

/** Client-side mirror of the server slug rules; null when valid. */
export function slugProblem(slug: string): string | null {
  if (slug.length < 3 || slug.length > 60) return 'Use 3 to 60 characters.'
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'Use lowercase letters, numbers and single hyphens, with no hyphen at the start or end.'
  if (RESERVED_SLUGS.includes(slug)) return 'That word is reserved. Choose another.'
  return null
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
}

export interface ImpactExample { title: string; text: string }
export interface OrgSocial { facebook?: string; instagram?: string; x?: string; youtube?: string; linkedin?: string }

export interface OrgGalleryItem { id: string; image_url: string; caption: string | null; sort_order?: number }
export interface OrgSponsor {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  tier: string | null
  permission_confirmed: boolean
  sort_order?: number
}

export interface AuctionOrganization {
  id: string
  slug: string
  name: string
  tagline: string | null
  logo_url: string | null
  cover_image_url: string | null
  story: string | null
  beneficiaries: string | null
  goal_cents: number | null
  impact_examples: ImpactExample[]
  website_url: string | null
  contact_email: string | null
  ein: string | null
  social: OrgSocial
  is_published: boolean
  gallery: OrgGalleryItem[]
  sponsors: OrgSponsor[]
}

/** Accepts either a bare organization row or { organization, gallery, sponsors }; null when none. */
export function normalizeOrganization(data: unknown): AuctionOrganization | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as Record<string, unknown>
  const org = (raw.organization && typeof raw.organization === 'object' ? raw.organization : raw) as Record<string, unknown>
  if (!org.id && !org.slug) return null
  const list = <T,>(...candidates: unknown[]): T[] => {
    for (const c of candidates) if (Array.isArray(c)) return c as T[]
    return []
  }
  const sortBy = <T extends { sort_order?: number }>(rows: T[]) => [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  return {
    ...(org as unknown as AuctionOrganization),
    impact_examples: list<ImpactExample>(org.impact_examples),
    social: (org.social && typeof org.social === 'object' ? org.social : {}) as OrgSocial,
    gallery: sortBy(list<OrgGalleryItem>(org.gallery, raw.gallery, org.auction_org_gallery)),
    sponsors: sortBy(list<OrgSponsor>(org.sponsors, raw.sponsors, org.auction_org_sponsors)),
  }
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/** Validates and uploads an image through the existing organizer upload endpoint; returns its URL. */
export async function uploadAuctionImage(original: File): Promise<string> {
  if (!IMAGE_TYPES.includes(original.type)) throw new Error('Photos must be JPEG, PNG or WebP.')
  const file = await compressImage(original, { maxBytes: MAX_UPLOAD_BYTES })
  const form = new FormData()
  form.append('file', file)
  const res = await api.post<{ url: string }>('/auctions/manage/upload/item-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.url
}

export interface Donation {
  id: string
  auction_id: string
  donor_name: string
  donor_business: string | null
  donor_email: string | null
  donor_phone: string | null
  phone_verified_at?: string | null
  title: string
  description: string | null
  category: string | null
  estimated_value_cents: number | null
  image_urls: string[]
  condition: string | null
  specifications: string | null
  whats_included: string | null
  restrictions: string | null
  expires_on: string | null
  fulfillment_method: FulfillmentMethod | null
  fulfillment_details: string | null
  is_experience: boolean
  scheduling_requirements: string | null
  blackout_dates: string | null
  recognition_ok: boolean
  status: DonationStatus
  decline_reason: string | null
  item_id: string | null
  created_at: string
}
