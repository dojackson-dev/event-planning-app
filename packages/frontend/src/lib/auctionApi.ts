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

export type AuctionPhase = 'accepting_donations' | 'preview' | 'bidding_open' | 'closed' | 'upcoming'
export type FulfillmentMethod = 'pickup' | 'delivery' | 'shipping' | 'digital' | 'arranged_with_donor'

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
  // Added by the organization-pages feature; absent from older API responses.
  slug?: string | null
  org_slug?: string | null
  cover_image_url?: string | null
  phase?: AuctionPhase | null
  accepts_donations?: boolean
  donations_close_at?: string | null
  donations_open?: boolean
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
  donor_business?: string | null
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

// ---- organization pages (see the auction organization design contract) ----

export interface ImpactExample {
  title: string
  text: string
}

export interface PublicOrg {
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
  social: Partial<Record<'facebook' | 'instagram' | 'x' | 'youtube' | 'linkedin', string>>
}

export interface GalleryImage {
  id: string
  image_url: string
  caption: string | null
}

export interface Sponsor {
  id: string
  name: string
  logo_url: string | null
  website_url: string | null
  tier: string | null
}

export interface PublicAuctionCard {
  id: string
  slug: string | null
  title: string
  description: string | null
  cover_image_url: string | null
  phase: AuctionPhase
  starts_at: string | null
  ends_at: string | null
  item_count: number
  bid_total_cents?: number | null
}

export interface OrganizationPageData {
  organization: PublicOrg
  gallery: GalleryImage[]
  sponsors: Sponsor[]
  auctions: PublicAuctionCard[]
}

export interface AuctionStoryData {
  organization: PublicOrg | null
  gallery: GalleryImage[]
  sponsors: Sponsor[]
  auction: {
    id: string
    slug: string | null
    title: string
    description: string | null
    cover_image_url: string | null
    phase: AuctionPhase
    status: string
    starts_at: string | null
    ends_at: string | null
    accepts_donations: boolean
    donations_close_at: string | null
    donations_open?: boolean
    org_slug: string | null
  }
  goal_cents: number | null
  raised_cents: number | null
}

export interface ResolvedAuction {
  auctionId: string
  organizationId: string
}

const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** The API may omit or null any optional field, so every response is normalised before use. */
export function normalizeOrg(raw: Partial<PublicOrg> | null | undefined): PublicOrg | null {
  if (!raw || typeof raw !== 'object') return null
  return {
    id: String(raw.id ?? ''),
    slug: String(raw.slug ?? ''),
    name: String(raw.name ?? ''),
    tagline: str(raw.tagline),
    logo_url: str(raw.logo_url),
    cover_image_url: str(raw.cover_image_url),
    story: str(raw.story),
    beneficiaries: str(raw.beneficiaries),
    goal_cents: typeof raw.goal_cents === 'number' && raw.goal_cents > 0 ? raw.goal_cents : null,
    impact_examples: arr<ImpactExample>(raw.impact_examples).filter((e) => e && (e.title || e.text)),
    website_url: str(raw.website_url),
    contact_email: str(raw.contact_email),
    social: raw.social && typeof raw.social === 'object' ? raw.social : {},
  }
}

export function normalizeOrganizationPage(raw: Partial<OrganizationPageData> | null | undefined): OrganizationPageData | null {
  const organization = normalizeOrg(raw?.organization)
  if (!organization) return null
  return {
    organization,
    gallery: arr<GalleryImage>(raw?.gallery),
    sponsors: arr<Sponsor>(raw?.sponsors),
    auctions: arr<PublicAuctionCard>(raw?.auctions),
  }
}

export function normalizeStory(raw: Partial<AuctionStoryData> | null | undefined): AuctionStoryData | null {
  if (!raw?.auction) return null
  return {
    organization: normalizeOrg(raw.organization),
    gallery: arr<GalleryImage>(raw.gallery),
    sponsors: arr<Sponsor>(raw.sponsors),
    auction: {
      ...raw.auction,
      slug: raw.auction.slug ?? null,
      description: raw.auction.description ?? null,
      cover_image_url: raw.auction.cover_image_url ?? null,
      accepts_donations: !!raw.auction.accepts_donations,
      donations_close_at: raw.auction.donations_close_at ?? null,
      donations_open: raw.auction.donations_open,
      org_slug: raw.auction.org_slug ?? null,
    },
    goal_cents: typeof raw.goal_cents === 'number' ? raw.goal_cents : raw.organization?.goal_cents ?? null,
    raised_cents: typeof raw.raised_cents === 'number' ? raw.raised_cents : null,
  }
}

export async function getOrganization(slug: string): Promise<OrganizationPageData | null> {
  const res = await auctionApi.get<OrganizationPageData>(`/organizations/${encodeURIComponent(slug)}`)
  return normalizeOrganizationPage(res.data)
}

export async function resolveAuction(orgSlug: string, auctionSlug: string): Promise<ResolvedAuction> {
  const res = await auctionApi.get<ResolvedAuction>(`/resolve/${encodeURIComponent(orgSlug)}/${encodeURIComponent(auctionSlug)}`)
  return res.data
}

/** Returns null when the story endpoint is missing or fails: legacy auctions simply have no story. */
export async function getAuctionStory(auctionId: string): Promise<AuctionStoryData | null> {
  try {
    const res = await auctionApi.get<AuctionStoryData>(`/${auctionId}/story`)
    return normalizeStory(res.data)
  } catch {
    return null
  }
}

// ---- item donations ----

export interface DonationSubmission {
  donor_name: string
  donor_business?: string
  donor_email: string
  donor_phone: string
  title: string
  description: string
  estimated_value_cents: number
  image_urls: string[]
  restrictions?: string
  expires_on?: string
  fulfillment_method: FulfillmentMethod
  fulfillment_details?: string
  condition?: string
  specifications?: string
  whats_included?: string
  is_experience: boolean
  scheduling_requirements?: string
  blackout_dates?: string
  recognition_ok: boolean
  /** Honeypot: real users never fill this in. */
  website: string
}

const donorKey = (auctionId: string) => `auction_donor_token:${auctionId}`

export function getDonorToken(auctionId: string): { token: string; phone: string } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(donorKey(auctionId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token?: string; phone?: string; expiresAt?: number }
    if (!parsed.token || !parsed.phone || (parsed.expiresAt && parsed.expiresAt <= Date.now())) {
      window.sessionStorage.removeItem(donorKey(auctionId))
      return null
    }
    return { token: parsed.token, phone: parsed.phone }
  } catch {
    return null
  }
}

export function setDonorToken(auctionId: string, token: string, phone: string, expiresInSeconds?: number) {
  const expiresAt = Date.now() + (expiresInSeconds && expiresInSeconds > 0 ? expiresInSeconds : 25 * 60) * 1000
  try {
    window.sessionStorage.setItem(donorKey(auctionId), JSON.stringify({ token, phone, expiresAt }))
  } catch {
    // Storage can be unavailable (private mode); the token still lives in component state.
  }
}

export function clearDonorToken(auctionId: string) {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(donorKey(auctionId))
}

const donorHeaders = (token: string) => ({ Authorization: `Bearer ${token}`, 'x-auction-token': token })

export async function requestDonorCode(auctionId: string, phone: string, name: string): Promise<{ devCode?: string }> {
  const res = await auctionApi.post<{ sent?: boolean; dev_code?: string }>(`/${auctionId}/donations/otp`, { phone, name })
  // dev_code only comes back from a local server running with AUCTION_DEV_OTP_BYPASS; never in production.
  return { devCode: typeof res.data?.dev_code === 'string' ? res.data.dev_code : undefined }
}

export async function verifyDonorCode(auctionId: string, phone: string, code: string): Promise<{ donorToken: string; expiresInSeconds?: number }> {
  const res = await auctionApi.post<{ donorToken: string; expiresInSeconds?: number }>(`/${auctionId}/donations/verify`, { phone, code })
  return res.data
}

export async function uploadDonationImage(auctionId: string, token: string, file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await auctionApi.post<{ url: string }>(`/${auctionId}/donations/upload-image`, form, {
    headers: { ...donorHeaders(token), 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  })
  return res.data.url
}

export async function submitDonation(auctionId: string, token: string, body: DonationSubmission): Promise<{ id: string; status: string }> {
  const res = await auctionApi.post<{ id: string; status: string }>(`/${auctionId}/donations`, body, { headers: donorHeaders(token) })
  return res.data
}

// ---- server-side fetch (metadata + server components) ----

export type ServerResult<T> = { status: 'ok'; data: T } | { status: 'not_found' } | { status: 'error' }

/** Server-only fetch with ISR caching. Never throws: callers fall back to generic output. */
export async function serverGetPublic<T>(path: string): Promise<ServerResult<T>> {
  try {
    const res = await fetch(`${API_URL}/auctions/public${path}`, { next: { revalidate: 60 } })
    if (res.status === 404) return { status: 'not_found' }
    if (!res.ok) return { status: 'error' }
    return { status: 'ok', data: (await res.json()) as T }
  } catch {
    return { status: 'error' }
  }
}

export async function serverGetOrganization(slug: string): Promise<ServerResult<OrganizationPageData>> {
  const res = await serverGetPublic<OrganizationPageData>(`/organizations/${encodeURIComponent(slug)}`)
  if (res.status !== 'ok') return res
  const data = normalizeOrganizationPage(res.data)
  return data ? { status: 'ok', data } : { status: 'not_found' }
}

export async function serverResolveAuction(orgSlug: string, auctionSlug: string): Promise<ServerResult<ResolvedAuction>> {
  return serverGetPublic<ResolvedAuction>(`/resolve/${encodeURIComponent(orgSlug)}/${encodeURIComponent(auctionSlug)}`)
}

export async function serverGetStory(auctionId: string): Promise<ServerResult<AuctionStoryData>> {
  const res = await serverGetPublic<AuctionStoryData>(`/${auctionId}/story`)
  if (res.status !== 'ok') return res
  const data = normalizeStory(res.data)
  return data ? { status: 'ok', data } : { status: 'not_found' }
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
