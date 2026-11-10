import { createHmac, timingSafeEqual } from 'crypto';

/** The secret that signs unsubscribe links. Falls back to the service key so links work without extra setup. */
function secret(): string | null {
  return (
    process.env.OUTREACH_UNSUBSCRIBE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    null
  );
}

export function normalizeEmailKey(email: string): string {
  return email.trim().toLowerCase();
}

export function unsubscribeSecretConfigured(): boolean {
  return secret() !== null;
}

export function unsubscribeToken(email: string): string {
  const key = secret();
  if (!key) throw new Error('No unsubscribe secret is configured.');
  return createHmac('sha256', key)
    .update(`unsubscribe:${normalizeEmailKey(email)}`)
    .digest('base64url');
}

export function verifyUnsubscribeToken(email: string, token: unknown): boolean {
  if (typeof token !== 'string' || token.length === 0 || !secret())
    return false;
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(email: string): string {
  const base = (
    process.env.FRONTEND_URL || 'https://www.eventecos.com'
  ).replace(/\/+$/, '');
  return `${base}/unsubscribe?e=${encodeURIComponent(normalizeEmailKey(email))}&t=${unsubscribeToken(email)}`;
}
