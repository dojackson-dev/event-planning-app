export const RESERVED_SLUGS = [
  'items',
  'register',
  'login',
  'my-bids',
  'pay',
  'donate',
  'o',
  'new',
  'admin',
  'api',
  'manage',
] as const;

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const SLUG_MIN = 3;
export const SLUG_MAX = 60;

export type SlugCheck =
  | { ok: true; slug: string }
  | { ok: false; reason: string };

/**
 * Trims and lower-cases, then validates a URL slug. Rejects UUID-shaped slugs because the first path
 * segment being a UUID selects the legacy /auctions/<uuid> routes.
 */
export function checkSlug(value: unknown): SlugCheck {
  if (typeof value !== 'string') {
    return { ok: false, reason: 'Enter a web address.' };
  }
  const slug = value.trim().toLowerCase();
  if (slug.length < SLUG_MIN || slug.length > SLUG_MAX) {
    return {
      ok: false,
      reason: `Use ${SLUG_MIN} to ${SLUG_MAX} characters.`,
    };
  }
  if (!SLUG_RE.test(slug)) {
    return {
      ok: false,
      reason:
        'Use only lowercase letters, numbers and single hyphens, and do not start or end with a hyphen.',
    };
  }
  if ((RESERVED_SLUGS as readonly string[]).includes(slug)) {
    return { ok: false, reason: 'That address is reserved. Try another.' };
  }
  if (UUID_RE.test(slug)) {
    return { ok: false, reason: 'That address is not allowed. Try another.' };
  }
  return { ok: true, slug };
}
