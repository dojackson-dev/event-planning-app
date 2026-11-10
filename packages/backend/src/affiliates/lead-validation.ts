import { BadRequestException } from '@nestjs/common';

export const ATTACHMENT_BUCKET = 'lead-attachments';

export const LEAD_TYPES: Record<string, string> = {
  event_owner: 'Event Owner',
  venue_owner: 'Venue Owner',
  vendor: 'Vendor',
  caterer: 'Caterer',
  promoter: 'Promoter',
  artist: 'Artist',
  other: 'Other',
};

/** Sources an agent can pick by hand. csv_import and demo_request are set by the system. */
export const LEAD_SOURCES: Record<string, string> = {
  manual: 'Added manually',
  referral: 'Referral',
  social_media: 'Social media',
  networking_event: 'Networking event',
  website: 'Website',
  other: 'Other',
  csv_import: 'CSV import',
  demo_request: 'Demo request',
};
const PICKABLE_SOURCES = [
  'manual',
  'referral',
  'social_media',
  'networking_event',
  'website',
  'other',
];

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LeadInput {
  name?: string;
  phone?: string;
  business_name?: string | null;
  email?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  lead_type?: string | null;
  source?: string;
  description?: string | null;
  notes?: string | null;
  next_follow_up_at?: string | null;
}

/** Role keys from the public Book a Demo form that map onto a lead type. */
const ROLE_TO_TYPE: Record<string, string> = {
  venue_owner: 'venue_owner',
  promoter: 'promoter',
  artist: 'artist',
  vendor: 'vendor',
};

export function effectiveLeadType(
  leadType: string | null | undefined,
  roles: string[] | null | undefined,
): string | null {
  if (leadType && LEAD_TYPES[leadType]) return leadType;
  for (const role of roles ?? []) {
    if (ROLE_TO_TYPE[role]) return ROLE_TO_TYPE[role];
  }
  return null;
}

const TYPE_ALIASES: Array<[RegExp, string]> = [
  [/cater|food|chef|kitchen|bbq/, 'caterer'],
  [/venue|hall|ballroom|banquet|space/, 'venue_owner'],
  [/promot/, 'promoter'],
  [/artist|musician|band|dj|performer|singer/, 'artist'],
  [/vendor|supplier|rental|decor|florist|photograph|video|av |audio/, 'vendor'],
  [/event|planner|planning|organizer|organiser|wedding/, 'event_owner'],
];

/** Maps free text from a CSV ("Catering", "Wedding planner") onto a lead type key. */
export function mapLeadType(value: string): string | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  const key = text.replace(/[\s-]+/g, '_');
  if (LEAD_TYPES[key]) return key;
  for (const [pattern, type] of TYPE_ALIASES) {
    if (pattern.test(text)) return type;
  }
  return 'other';
}

export function phoneDigits(phone: string): string {
  return (phone ?? '').replace(/\D/g, '');
}

export interface DuplicateKeys {
  phone: string | null;
  email: string | null;
  business: string | null;
}

/** Mirrors the generated phone_digits / email_key / business_key columns in the database. */
export function duplicateKeys(input: {
  phone?: string | null;
  email?: string | null;
  business_name?: string | null;
}): DuplicateKeys {
  const digits = phoneDigits(input.phone ?? '');
  const email = (input.email ?? '').trim().toLowerCase();
  const business = (input.business_name ?? '').trim().toLowerCase();
  return {
    phone: digits.length >= 7 ? digits.slice(-10) : null,
    email: email || null,
    business: business || null,
  };
}

function bad(message: string): never {
  throw new BadRequestException(message);
}

function optionalText(
  value: unknown,
  label: string,
  max: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') bad(`${label} must be text.`);
  const text = value.trim();
  if (text.length > max) bad(`${label} must be ${max} characters or fewer.`);
  return text === '' ? null : text;
}

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== 'string' || value.trim() === '') {
    bad(`${label} is required.`);
  }
  const text = value.trim();
  if (text.length > max) bad(`${label} must be ${max} characters or fewer.`);
  return text;
}

export function normalizePhone(value: unknown): string {
  const phone = requiredText(value, 'Phone number', 40);
  const digits = phoneDigits(phone);
  if (
    !/^[\d\s+().\-x#]+$/i.test(phone) ||
    digits.length < 7 ||
    digits.length > 15
  ) {
    bad('Enter a valid phone number.');
  }
  return phone;
}

export function normalizeEmail(value: unknown): string | null {
  const email = optionalText(value, 'Email', 254);
  if (email === null) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    bad('Enter a valid email address.');
  return email.toLowerCase();
}

export function normalizeWebsite(value: unknown): string | null {
  const raw = optionalText(value, 'Website', 200);
  if (raw === null) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
    ? raw
    : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return bad('Enter a valid website address.');
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    !url.hostname.includes('.')
  ) {
    bad('Enter a valid website address.');
  }
  const href = url.href;
  return url.pathname === '/' && !url.search && !url.hash
    ? href.replace(/\/$/, '')
    : href;
}

export function normalizeFollowUp(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') bad('Follow-up must be a date.');
  const text = value.trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T12:00:00.000Z` : text;
  const time = Date.parse(iso);
  if (Number.isNaN(time)) bad('Follow-up must be a valid date.');
  return new Date(time).toISOString();
}

export function normalizeLeadType(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !LEAD_TYPES[value]) {
    bad(`Type must be one of: ${Object.keys(LEAD_TYPES).join(', ')}.`);
  }
  return value;
}

export function normalizeSource(value: unknown): string {
  if (typeof value !== 'string' || !PICKABLE_SOURCES.includes(value)) {
    bad(`Source must be one of: ${PICKABLE_SOURCES.join(', ')}.`);
  }
  return value;
}

/**
 * Validates lead fields from a request body. For a full lead (partial: false)
 * name and phone are required; for an edit (partial: true) only the keys that
 * were sent are validated and returned.
 */
export function parseLeadInput(
  raw: unknown,
  opts: { partial: boolean },
): LeadInput {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<
    string,
    unknown
  >;
  const has = (key: string) => body[key] !== undefined;
  const out: LeadInput = {};

  if (!opts.partial || has('name')) {
    out.name = requiredText(body.name, 'Name', 120);
  }
  if (!opts.partial || has('phone')) {
    out.phone = normalizePhone(body.phone);
  }
  if (has('business_name')) {
    out.business_name = optionalText(body.business_name, 'Business name', 160);
  }
  if (has('email')) out.email = normalizeEmail(body.email);
  if (has('website')) out.website = normalizeWebsite(body.website);
  if (has('city')) out.city = optionalText(body.city, 'City', 80);
  if (has('state')) out.state = optionalText(body.state, 'State', 40);
  if (has('lead_type')) out.lead_type = normalizeLeadType(body.lead_type);
  if (has('source')) out.source = normalizeSource(body.source);
  if (has('description')) {
    out.description = optionalText(body.description, 'Description', 2000);
  }
  if (has('notes')) out.notes = optionalText(body.notes, 'Notes', 2000);
  if (has('next_follow_up_at')) {
    out.next_follow_up_at = normalizeFollowUp(body.next_follow_up_at);
  }
  return out;
}
