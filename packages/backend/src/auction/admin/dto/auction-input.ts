import { BadRequestException } from '@nestjs/common';
import {
  AUCTION_FULFILLMENT_METHODS,
  AUCTION_SALE_MODES,
} from '../../auction.types';
import type {
  AuctionFulfillmentMethod,
  AuctionItemRow,
  AuctionSaleMode,
} from '../../auction.types';
import { checkSlug } from '../../auction-slug';

export const MAX_CENTS = 100_000_000;
export const MAX_IMAGES_PER_ITEM = 5;
export const MAX_IMAGES_PER_DONATION = 6;
export const HARD_CLOSE_MINUTES = 120;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function asObject(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestException('Invalid request body.');
  }
  return raw as Record<string, unknown>;
}

export function intIn(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new BadRequestException(
      `${label} must be a whole number from ${min} to ${max}.`,
    );
  }
  return value;
}

export function cents(value: unknown, label: string, min = 0): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < min ||
    value > MAX_CENTS
  ) {
    throw new BadRequestException(
      `${label} must be a whole number of cents from ${min} to ${MAX_CENTS}.`,
    );
  }
  return value;
}

export function requiredText(
  value: unknown,
  label: string,
  max: number,
): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} is required.`);
  }
  const text = value.trim();
  if (text.includes('\u0000')) {
    throw new BadRequestException(`${label} contains invalid characters.`);
  }
  if (!text || text.length > max) {
    throw new BadRequestException(
      `${label} is required (max ${max} characters).`,
    );
  }
  return text;
}

export function optionalText(
  value: unknown,
  label: string,
  max: number,
): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} must be text.`);
  }
  const text = value.trim();
  if (text.includes('\u0000')) {
    throw new BadRequestException(`${label} contains invalid characters.`);
  }
  if (text.length > max) {
    throw new BadRequestException(`${label} is too long (max ${max}).`);
  }
  return text || null;
}

function uuid(value: unknown, label: string): string {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new BadRequestException(`${label} is not a valid id.`);
  }
  return value;
}

export function isoDate(value: unknown, label: string): string {
  const d = typeof value === 'string' ? new Date(value) : new Date(NaN);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() > 2200) {
    throw new BadRequestException(`${label} must be a valid date-time.`);
  }
  return d.toISOString();
}

export function httpsUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2000) {
    throw new BadRequestException('Each image must be an https URL.');
  }
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new BadRequestException('Each image must be an https URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new BadRequestException('Each image must be an https URL.');
  }
  return url.toString();
}

/** http(s) link for websites; credentials in the URL are rejected. */
export function httpUrl(value: unknown, label: string): string {
  const bad = () =>
    new BadRequestException(`${label} must be an http(s) web address.`);
  if (typeof value !== 'string' || value.length > 2000) throw bad();
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw bad();
  }
  if (
    (url.protocol !== 'https:' && url.protocol !== 'http:') ||
    url.username ||
    url.password
  ) {
    throw bad();
  }
  return url.toString();
}

export function optionalHttpUrl(value: unknown, label: string): string | null {
  if (value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return httpUrl(value, label);
}

export function optionalHttpsImage(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return httpsUrl(value);
}

export function boolField(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') {
    throw new BadRequestException(`${label} must be true or false.`);
  }
  return value;
}

function dateOnly(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException(`${label} must be a date (YYYY-MM-DD).`);
  }
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new BadRequestException(`${label} must be a valid date.`);
  }
  return value;
}

// ─── Shared item detail fields (items and donations) ────────────

export interface ItemDetails {
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
}

const ITEM_DETAIL_TEXT_FIELDS = [
  ['condition', 'Condition', 200],
  ['specifications', 'Specifications', 2000],
  ['whats_included', "What's included", 2000],
  ['restrictions', 'Restrictions', 2000],
  ['fulfillment_details', 'Fulfillment details', 2000],
  ['scheduling_requirements', 'Scheduling requirements', 1000],
  ['blackout_dates', 'Blackout dates', 1000],
] as const;

export function parseFulfillmentMethod(
  value: unknown,
): AuctionFulfillmentMethod {
  if (
    typeof value !== 'string' ||
    !(AUCTION_FULFILLMENT_METHODS as readonly string[]).includes(value)
  ) {
    throw new BadRequestException(
      `Fulfillment method must be one of: ${AUCTION_FULFILLMENT_METHODS.join(', ')}.`,
    );
  }
  return value as AuctionFulfillmentMethod;
}

/** Validates only the detail fields that are present (null clears a field). */
export function parseItemDetails(
  dto: Record<string, unknown>,
): Partial<ItemDetails> {
  const out: Partial<ItemDetails> = {};
  for (const [key, label, max] of ITEM_DETAIL_TEXT_FIELDS) {
    if (dto[key] !== undefined) out[key] = optionalText(dto[key], label, max);
  }
  if (dto.expires_on !== undefined) {
    out.expires_on =
      dto.expires_on === null ? null : dateOnly(dto.expires_on, 'Expiry date');
  }
  if (dto.fulfillment_method !== undefined) {
    out.fulfillment_method =
      dto.fulfillment_method === null
        ? null
        : parseFulfillmentMethod(dto.fulfillment_method);
  }
  if (dto.is_experience !== undefined) {
    out.is_experience = boolField(dto.is_experience, 'Is experience');
  }
  return out;
}

// ─── Auction ────────────────────────────────────────────────────

export interface AuctionInput {
  title?: string;
  description?: string | null;
  public_event_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  anti_snipe_window_seconds?: number;
  anti_snipe_extension_seconds?: number;
  payment_grace_hours?: number;
  default_exposure_limit_cents?: number;
  slug?: string | null;
  cover_image_url?: string | null;
  accepts_donations?: boolean;
  donations_close_at?: string | null;
  page_published?: boolean;
}

/** Validates only the fields present; `full` makes the title mandatory. */
export function parseAuctionInput(raw: unknown, full: boolean): AuctionInput {
  const dto = asObject(raw);
  const out: AuctionInput = {};
  if (full || dto.title !== undefined) {
    out.title = requiredText(dto.title, 'Title', 200);
  }
  if (dto.description !== undefined) {
    out.description = optionalText(dto.description, 'Description', 5000);
  }
  if (dto.public_event_id !== undefined) {
    out.public_event_id =
      dto.public_event_id === null ? null : uuid(dto.public_event_id, 'Event');
  }
  if (dto.starts_at !== undefined) {
    out.starts_at =
      dto.starts_at === null ? null : isoDate(dto.starts_at, 'Start time');
  }
  if (dto.ends_at !== undefined) {
    out.ends_at =
      dto.ends_at === null ? null : isoDate(dto.ends_at, 'End time');
  }
  if (dto.anti_snipe_window_seconds !== undefined) {
    out.anti_snipe_window_seconds = intIn(
      dto.anti_snipe_window_seconds,
      'Anti-sniping window (seconds)',
      0,
      3600,
    );
  }
  if (dto.anti_snipe_extension_seconds !== undefined) {
    out.anti_snipe_extension_seconds = intIn(
      dto.anti_snipe_extension_seconds,
      'Anti-sniping extension (seconds)',
      0,
      3600,
    );
  }
  if (dto.payment_grace_hours !== undefined) {
    out.payment_grace_hours = intIn(
      dto.payment_grace_hours,
      'Payment grace (hours)',
      1,
      720,
    );
  }
  if (dto.default_exposure_limit_cents !== undefined) {
    out.default_exposure_limit_cents = cents(
      dto.default_exposure_limit_cents,
      'Default exposure limit',
      100,
    );
  }
  if (dto.slug !== undefined) {
    if (dto.slug === null || dto.slug === '') {
      out.slug = null;
    } else {
      const checked = checkSlug(dto.slug);
      if (!checked.ok) {
        throw new BadRequestException(`Web address: ${checked.reason}`);
      }
      out.slug = checked.slug;
    }
  }
  if (dto.cover_image_url !== undefined) {
    out.cover_image_url = optionalHttpsImage(dto.cover_image_url);
  }
  if (dto.accepts_donations !== undefined) {
    out.accepts_donations = boolField(
      dto.accepts_donations,
      'Accepts donations',
    );
  }
  if (dto.donations_close_at !== undefined) {
    out.donations_close_at =
      dto.donations_close_at === null
        ? null
        : isoDate(dto.donations_close_at, 'Donations close time');
  }
  if (dto.page_published !== undefined) {
    out.page_published = boolField(dto.page_published, 'Page published');
  }
  return out;
}

// ─── Items ──────────────────────────────────────────────────────

export type ItemPatch = Partial<
  Pick<
    AuctionItemRow,
    | 'donor_business'
    | 'donor_recognition'
    | keyof ItemDetails
    | 'sale_mode'
    | 'title'
    | 'description'
    | 'category'
    | 'donor_name'
    | 'image_urls'
    | 'fair_market_value_cents'
    | 'tax_code'
    | 'starting_bid_cents'
    | 'reserve_cents'
    | 'increment_cents'
    | 'buy_now_cents'
    | 'buy_now_available'
    | 'fixed_price_cents'
    | 'quantity'
    | 'per_bidder_limit'
    | 'lot_number'
    | 'sort_order'
  >
>;

/** Validates only the fields present; `full` requires title and an explicit fair market value. */
export function parseItemInput(
  raw: unknown,
  full: boolean,
  maxImages = MAX_IMAGES_PER_ITEM,
): ItemPatch {
  const dto = asObject(raw);
  const out: ItemPatch = {};

  if (dto.sale_mode !== undefined) {
    if (!AUCTION_SALE_MODES.includes(dto.sale_mode as AuctionSaleMode)) {
      throw new BadRequestException('Sale mode must be auction or fixed.');
    }
    out.sale_mode = dto.sale_mode as AuctionSaleMode;
  }
  if (full || dto.title !== undefined) {
    out.title = requiredText(dto.title, 'Title', 200);
  }
  if (dto.description !== undefined) {
    out.description = optionalText(dto.description, 'Description', 5000);
  }
  if (dto.category !== undefined) {
    out.category = optionalText(dto.category, 'Category', 100);
  }
  if (dto.donor_name !== undefined) {
    out.donor_name = optionalText(dto.donor_name, 'Donor name', 200);
  }
  if (dto.donor_business !== undefined) {
    out.donor_business = optionalText(
      dto.donor_business,
      'Donor business',
      200,
    );
  }
  if (dto.donor_recognition !== undefined) {
    out.donor_recognition = boolField(
      dto.donor_recognition,
      'Donor recognition',
    );
  }
  Object.assign(out, parseItemDetails(dto));
  if (dto.tax_code !== undefined) {
    out.tax_code = optionalText(dto.tax_code, 'Tax code', 50);
  }
  if (dto.image_urls !== undefined) {
    if (!Array.isArray(dto.image_urls) || dto.image_urls.length > maxImages) {
      throw new BadRequestException(
        `Images must be a list of up to ${maxImages} https URLs.`,
      );
    }
    out.image_urls = (dto.image_urls as unknown[]).map(httpsUrl);
  }
  if (full && dto.fair_market_value_cents === undefined) {
    throw new BadRequestException(
      'Fair market value is required (enter 0 if the item has none).',
    );
  }
  if (dto.fair_market_value_cents !== undefined) {
    out.fair_market_value_cents = cents(
      dto.fair_market_value_cents,
      'Fair market value',
    );
  }
  for (const key of [
    'starting_bid_cents',
    'reserve_cents',
    'increment_cents',
    'buy_now_cents',
    'fixed_price_cents',
  ] as const) {
    const v = dto[key];
    if (v === undefined) continue;
    out[key] = v === null ? null : cents(v, labelFor(key), 1);
  }
  if (dto.quantity !== undefined) {
    out.quantity = intIn(dto.quantity, 'Quantity', 1, 100_000);
  }
  if (dto.per_bidder_limit !== undefined) {
    out.per_bidder_limit =
      dto.per_bidder_limit === null
        ? null
        : intIn(dto.per_bidder_limit, 'Per-bidder limit', 1, 100_000);
  }
  if (dto.lot_number !== undefined) {
    out.lot_number =
      dto.lot_number === null
        ? null
        : intIn(dto.lot_number, 'Lot number', 1, 100_000);
  }
  if (dto.sort_order !== undefined) {
    out.sort_order = intIn(dto.sort_order, 'Sort order', 0, 100_000);
  }
  return out;
}

function labelFor(key: string): string {
  switch (key) {
    case 'starting_bid_cents':
      return 'Starting bid';
    case 'reserve_cents':
      return 'Reserve';
    case 'increment_cents':
      return 'Bid increment';
    case 'buy_now_cents':
      return 'Buy-it-now price';
    default:
      return 'Fixed price';
  }
}

/**
 * Applies cross-field rules to `current + patch` and returns the full patch to
 * write: fields that do not apply to the sale mode are nulled and
 * buy_now_available is recomputed.
 */
export function normalizeItemPatch(
  current: Partial<AuctionItemRow> | null,
  patch: ItemPatch,
): ItemPatch {
  const m = {
    sale_mode: 'auction' as AuctionSaleMode,
    quantity: 1,
    per_bidder_limit: null as number | null,
    starting_bid_cents: null as number | null,
    reserve_cents: null as number | null,
    increment_cents: null as number | null,
    buy_now_cents: null as number | null,
    fixed_price_cents: null as number | null,
    bid_count: 0,
    ...current,
    ...patch,
  };
  const out: ItemPatch = { ...patch };

  const notAllowed = (keys: Array<keyof ItemPatch>) => {
    for (const k of keys) {
      if (patch[k] !== undefined && patch[k] !== null) {
        throw new BadRequestException(
          `${labelFor(String(k))} does not apply to this sale mode.`,
        );
      }
    }
  };

  if (m.sale_mode === 'fixed') {
    notAllowed([
      'starting_bid_cents',
      'reserve_cents',
      'increment_cents',
      'buy_now_cents',
    ]);
    if (m.fixed_price_cents == null) {
      throw new BadRequestException('Fixed-price items need a price.');
    }
    if (m.per_bidder_limit != null && m.per_bidder_limit > m.quantity) {
      throw new BadRequestException(
        'Per-bidder limit cannot exceed the quantity.',
      );
    }
    out.starting_bid_cents = null;
    out.reserve_cents = null;
    out.increment_cents = null;
    out.buy_now_cents = null;
    out.buy_now_available = false;
  } else {
    notAllowed(['fixed_price_cents', 'per_bidder_limit']);
    if (patch.quantity !== undefined && patch.quantity !== 1) {
      throw new BadRequestException('Auction items have a quantity of 1.');
    }
    if (m.starting_bid_cents == null) {
      throw new BadRequestException('Auction items need a starting bid.');
    }
    if (m.reserve_cents != null && m.reserve_cents < m.starting_bid_cents) {
      throw new BadRequestException(
        'Reserve must be at least the starting bid.',
      );
    }
    if (m.buy_now_cents != null) {
      if (m.buy_now_cents <= m.starting_bid_cents) {
        throw new BadRequestException(
          'Buy-it-now price must be higher than the starting bid.',
        );
      }
      if (m.reserve_cents != null && m.buy_now_cents < m.reserve_cents) {
        throw new BadRequestException(
          'Buy-it-now price cannot be below the reserve.',
        );
      }
    }
    out.fixed_price_cents = null;
    out.per_bidder_limit = null;
    out.quantity = 1;
    out.buy_now_available = m.buy_now_cents != null && m.bid_count === 0;
  }
  return out;
}
