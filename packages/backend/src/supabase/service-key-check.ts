/**
 * Catches a wrong SUPABASE_SERVICE_ROLE_KEY at startup. With the public key in its place the backend
 * still boots and signs users in, but every admin read quietly returns nothing (empty dashboards,
 * payments that never record), so a bad key must fail the deploy instead.
 */

interface KeyCheckInput {
  url: string;
  anonKey: string;
  serviceKey: string | undefined;
  production: boolean;
}

export interface ServiceKeyInfo {
  role: string | null;
  projectRef: string | null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload: unknown = JSON.parse(json);
    return payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function projectRefFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.split('.')[0] || null;
  } catch {
    return null;
  }
}

/** Returns a description of the problem, or null when the key is acceptable. */
export function checkServiceRoleKey({
  url,
  anonKey,
  serviceKey,
  production,
}: KeyCheckInput): string | null {
  if (!serviceKey) {
    return production ? 'SUPABASE_SERVICE_ROLE_KEY is not set.' : null;
  }

  if (serviceKey !== serviceKey.trim()) {
    return 'SUPABASE_SERVICE_ROLE_KEY has leading or trailing whitespace; re-paste it without extra spaces or line breaks.';
  }
  if (serviceKey === anonKey) {
    return 'SUPABASE_SERVICE_ROLE_KEY is the same as SUPABASE_ANON_KEY; it must be the service_role (secret) key.';
  }
  if (serviceKey.startsWith('sb_publishable_')) {
    return 'SUPABASE_SERVICE_ROLE_KEY is a publishable key; it must be the service_role (secret) key.';
  }
  // New-style secret keys are opaque, so the role and project cannot be read from them.
  if (serviceKey.startsWith('sb_secret_')) return null;

  const payload = decodeJwtPayload(serviceKey);
  if (!payload) {
    return production
      ? 'SUPABASE_SERVICE_ROLE_KEY is not a valid Supabase key.'
      : null;
  }

  const role = typeof payload.role === 'string' ? payload.role : null;
  if (role !== 'service_role') {
    return `SUPABASE_SERVICE_ROLE_KEY has the "${role ?? 'unknown'}" role; it must be the service_role key.`;
  }

  const ref = typeof payload.ref === 'string' ? payload.ref : null;
  const urlRef = projectRefFromUrl(url);
  if (ref && urlRef && ref !== urlRef) {
    return `SUPABASE_SERVICE_ROLE_KEY belongs to project "${ref}" but SUPABASE_URL points to "${urlRef}".`;
  }

  return null;
}

export function describeServiceKey(serviceKey: string): ServiceKeyInfo {
  const payload = decodeJwtPayload(serviceKey);
  return {
    role: typeof payload?.role === 'string' ? payload.role : null,
    projectRef: typeof payload?.ref === 'string' ? payload.ref : null,
  };
}
