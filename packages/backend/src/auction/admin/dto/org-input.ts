import { BadRequestException } from '@nestjs/common';
import { normalizeEmail } from '../../bidding/dto/register.dto';
import { checkSlug } from '../../auction-slug';
import {
  asObject,
  boolField,
  cents,
  intIn,
  optionalHttpUrl,
  optionalHttpsImage,
  optionalText,
  parseItemDetails,
  requiredText,
  httpsUrl,
  MAX_IMAGES_PER_DONATION,
} from './auction-input';
import type { ItemDetails } from './auction-input';

export const MAX_GALLERY_IMAGES = 30;
export const MAX_SPONSORS = 50;
export const MAX_IMPACT_EXAMPLES = 8;
export const SOCIAL_KEYS = [
  'facebook',
  'instagram',
  'x',
  'youtube',
  'linkedin',
] as const;

export interface OrganizationInput {
  slug?: string;
  name?: string;
  tagline?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  story?: string | null;
  beneficiaries?: string | null;
  goal_cents?: number | null;
  impact_examples?: Array<{ title: string; text: string }>;
  website_url?: string | null;
  contact_email?: string | null;
  ein?: string | null;
  social?: Record<string, string>;
  is_published?: boolean;
}

export function parseSlugValue(value: unknown, label = 'Web address'): string {
  const checked = checkSlug(value);
  if (!checked.ok) throw new BadRequestException(`${label}: ${checked.reason}`);
  return checked.slug;
}

/** Validates only the fields present; `create` makes slug and name mandatory. */
export function parseOrganizationInput(
  raw: unknown,
  create: boolean,
): OrganizationInput {
  const dto = asObject(raw);
  const out: OrganizationInput = {};

  if (create || dto.slug !== undefined) out.slug = parseSlugValue(dto.slug);
  if (create || dto.name !== undefined) {
    out.name = requiredText(dto.name, 'Organization name', 200);
  }
  if (dto.tagline !== undefined) {
    out.tagline = optionalText(dto.tagline, 'Tagline', 300);
  }
  if (dto.logo_url !== undefined)
    out.logo_url = optionalHttpsImage(dto.logo_url);
  if (dto.cover_image_url !== undefined) {
    out.cover_image_url = optionalHttpsImage(dto.cover_image_url);
  }
  if (dto.story !== undefined)
    out.story = optionalText(dto.story, 'Story', 10000);
  if (dto.beneficiaries !== undefined) {
    out.beneficiaries = optionalText(dto.beneficiaries, 'Beneficiaries', 2000);
  }
  if (dto.goal_cents !== undefined) {
    out.goal_cents =
      dto.goal_cents === null ? null : cents(dto.goal_cents, 'Goal');
  }
  if (dto.impact_examples !== undefined) {
    if (
      !Array.isArray(dto.impact_examples) ||
      dto.impact_examples.length > MAX_IMPACT_EXAMPLES
    ) {
      throw new BadRequestException(
        `Impact examples must be a list of up to ${MAX_IMPACT_EXAMPLES}.`,
      );
    }
    out.impact_examples = (dto.impact_examples as unknown[]).map((entry) => {
      const e = asObject(entry);
      return {
        title: requiredText(e.title, 'Impact title', 120),
        text: requiredText(e.text, 'Impact description', 500),
      };
    });
  }
  if (dto.website_url !== undefined) {
    out.website_url = optionalHttpUrl(dto.website_url, 'Website');
  }
  if (dto.contact_email !== undefined) {
    out.contact_email =
      dto.contact_email === null || dto.contact_email === ''
        ? null
        : normalizeEmail(dto.contact_email);
  }
  if (dto.ein !== undefined) {
    const ein = optionalText(dto.ein, 'EIN', 20);
    if (ein !== null && !/^[0-9A-Za-z-]{1,20}$/.test(ein)) {
      throw new BadRequestException(
        'EIN may only contain letters, numbers and hyphens.',
      );
    }
    out.ein = ein;
  }
  if (dto.social !== undefined) {
    const social = asObject(dto.social);
    const cleaned: Record<string, string> = {};
    for (const key of SOCIAL_KEYS) {
      const link = optionalHttpUrl(social[key] ?? null, `Social link (${key})`);
      if (link) cleaned[key] = link;
    }
    out.social = cleaned;
  }
  if (dto.is_published !== undefined) {
    out.is_published = boolField(dto.is_published, 'Published');
  }
  return out;
}

export interface GalleryInput {
  image_url?: string;
  caption?: string | null;
}

export function parseGalleryInput(raw: unknown, create: boolean): GalleryInput {
  const dto = asObject(raw);
  const out: GalleryInput = {};
  if (create || dto.image_url !== undefined)
    out.image_url = httpsUrl(dto.image_url);
  if (dto.caption !== undefined)
    out.caption = optionalText(dto.caption, 'Caption', 300);
  return out;
}

export interface SponsorInput {
  name?: string;
  logo_url?: string | null;
  website_url?: string | null;
  tier?: string | null;
  permission_confirmed?: boolean;
}

export function parseSponsorInput(raw: unknown, create: boolean): SponsorInput {
  const dto = asObject(raw);
  const out: SponsorInput = {};
  if (create || dto.name !== undefined) {
    out.name = requiredText(dto.name, 'Sponsor name', 200);
  }
  if (dto.logo_url !== undefined)
    out.logo_url = optionalHttpsImage(dto.logo_url);
  if (dto.website_url !== undefined) {
    out.website_url = optionalHttpUrl(dto.website_url, 'Sponsor website');
  }
  if (dto.tier !== undefined) out.tier = optionalText(dto.tier, 'Tier', 60);
  if (dto.permission_confirmed !== undefined) {
    out.permission_confirmed = boolField(
      dto.permission_confirmed,
      'Permission confirmed',
    );
  } else if (create) {
    out.permission_confirmed = false;
  }
  return out;
}

export function parseOrderIds(raw: unknown, max: number): string[] {
  const dto = asObject(raw);
  const ids = dto.ids;
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (
    !Array.isArray(ids) ||
    ids.length > max ||
    !ids.every((id) => typeof id === 'string' && uuidRe.test(id)) ||
    new Set(ids.map((id: string) => id.toLowerCase())).size !== ids.length
  ) {
    throw new BadRequestException('ids must be a list of unique ids.');
  }
  return (ids as string[]).map((id) => id.toLowerCase());
}

// ─── Donations (organizer side) ─────────────────────────────────

export interface DonationEditInput extends Partial<ItemDetails> {
  title?: string;
  description?: string | null;
  category?: string | null;
  estimated_value_cents?: number | null;
  image_urls?: string[];
  donor_name?: string;
  donor_business?: string | null;
}

export function parseImageUrls(value: unknown, max: number): string[] {
  if (!Array.isArray(value) || value.length > max) {
    throw new BadRequestException(
      `Images must be a list of up to ${max} https URLs.`,
    );
  }
  return (value as unknown[]).map(httpsUrl);
}

export function parseDonationEdit(raw: unknown): DonationEditInput {
  const dto = asObject(raw);
  const out: DonationEditInput = {};
  if (dto.title !== undefined)
    out.title = requiredText(dto.title, 'Title', 200);
  if (dto.description !== undefined) {
    out.description = optionalText(dto.description, 'Description', 5000);
  }
  if (dto.category !== undefined)
    out.category = optionalText(dto.category, 'Category', 100);
  if (dto.estimated_value_cents !== undefined) {
    out.estimated_value_cents =
      dto.estimated_value_cents === null
        ? null
        : cents(dto.estimated_value_cents, 'Estimated value');
  }
  if (dto.image_urls !== undefined) {
    out.image_urls = parseImageUrls(dto.image_urls, MAX_IMAGES_PER_DONATION);
  }
  if (dto.donor_name !== undefined) {
    out.donor_name = requiredText(dto.donor_name, 'Donor name', 200);
  }
  if (dto.donor_business !== undefined) {
    out.donor_business = optionalText(
      dto.donor_business,
      'Donor business',
      200,
    );
  }
  Object.assign(out, parseItemDetails(dto));
  return out;
}

export interface ApproveInput {
  starting_bid_cents: number;
  increment_cents: number | null;
  reserve_cents: number | null;
  buy_now_cents: number | null;
  category: string | null | undefined;
  lot_number: number | null;
}

export function parseApprove(raw: unknown): ApproveInput {
  const dto = asObject(raw);
  const optionalCents = (key: string, label: string): number | null =>
    dto[key] === undefined || dto[key] === null
      ? null
      : cents(dto[key], label, 1);
  return {
    starting_bid_cents: cents(dto.starting_bid_cents, 'Starting bid', 1),
    increment_cents: optionalCents('increment_cents', 'Bid increment'),
    reserve_cents: optionalCents('reserve_cents', 'Reserve'),
    buy_now_cents: optionalCents('buy_now_cents', 'Buy-it-now price'),
    category:
      dto.category === undefined
        ? undefined
        : optionalText(dto.category, 'Category', 100),
    lot_number:
      dto.lot_number === undefined || dto.lot_number === null
        ? null
        : intIn(dto.lot_number, 'Lot number', 1, 100_000),
  };
}

export function parseDecline(raw: unknown): { reason: string | null } {
  const dto = asObject(raw);
  return {
    reason:
      dto.reason === undefined ? null : optionalText(dto.reason, 'Reason', 500),
  };
}

export const DONATION_STATUSES = ['pending', 'approved', 'declined'] as const;
export type DonationStatus = (typeof DONATION_STATUSES)[number];

export function parseDonationStatus(value: unknown): DonationStatus | null {
  if (value === undefined || value === '') return null;
  if (
    typeof value !== 'string' ||
    !(DONATION_STATUSES as readonly string[]).includes(value)
  ) {
    throw new BadRequestException(
      'status must be pending, approved or declined.',
    );
  }
  return value as DonationStatus;
}
