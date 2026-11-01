import { createClient, SupabaseClient } from '@supabase/supabase-js';

type FetchLike = typeof fetch;

const DATA_PATHS = ['/rest/v1/', '/storage/v1/', '/functions/v1/'];

/**
 * supabase-js swaps in the signed-in user's token for every data request once `auth.signUp` or
 * `signInWithPassword` has run on a client, even with persistSession off. On the shared admin client that
 * turned every later admin read into a user read, so row-level security hid the data. This pins data
 * requests to the given key; auth requests are left alone.
 */
export function pinDataAuth(
  key: string,
  baseFetch: FetchLike = fetch,
): FetchLike {
  return (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (!DATA_PATHS.some((p) => url.includes(p))) {
      return baseFetch(input, init);
    }
    const headers = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined),
    );
    headers.set('Authorization', `Bearer ${key}`);
    headers.set('apikey', key);
    return baseFetch(input, { ...init, headers });
  };
}

/** Admin (service_role) client whose data requests can never be downgraded to a user session. */
export function createAdminClient(
  url: string,
  serviceKey: string,
  baseFetch?: FetchLike,
): SupabaseClient {
  return createClient(url, serviceKey, {
    db: { schema: 'public' },
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: pinDataAuth(serviceKey, baseFetch) },
  });
}
