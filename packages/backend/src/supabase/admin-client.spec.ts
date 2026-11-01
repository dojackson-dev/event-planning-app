import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from './admin-client';

const URL = 'https://proj.supabase.co';
const SERVICE_KEY = 'service-role-key';
const USER_TOKEN = 'new-users-access-token';

function mockFetch() {
  const seen: { url: string; auth: string | null }[] = [];
  const fn = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof globalThis.URL
          ? input.href
          : input.url;
    seen.push({ url, auth: new Headers(init?.headers).get('Authorization') });
    if (url.includes('/auth/v1/signup')) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            access_token: USER_TOKEN,
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'r',
            user: { id: 'u1', email: 'v@x.com' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    }
    return Promise.resolve(
      new Response('[]', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });
  return { fn: fn as unknown as typeof fetch, seen };
}

const dataAuth = (seen: { url: string; auth: string | null }[]) =>
  seen.filter((s) => s.url.includes('/rest/v1/')).map((s) => s.auth);

describe('admin client after a user signs up on it', () => {
  it('shows the bug: a plain client sends the new user token for data reads', async () => {
    const { fn, seen } = mockFetch();
    const plain = createClient(URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fn },
    });
    await plain.auth.signUp({ email: 'v@x.com', password: 'pw123456' });
    await plain.from('vendor_invoices').select('id');
    expect(dataAuth(seen)).toEqual([`Bearer ${USER_TOKEN}`]);
  });

  it('keeps data reads on the service key after signUp', async () => {
    const { fn, seen } = mockFetch();
    const admin = createAdminClient(URL, SERVICE_KEY, fn);
    await admin.from('vendor_invoices').select('id');
    await admin.auth.signUp({ email: 'v@x.com', password: 'pw123456' });
    await admin.from('vendor_invoices').select('id');
    expect(dataAuth(seen)).toEqual([
      `Bearer ${SERVICE_KEY}`,
      `Bearer ${SERVICE_KEY}`,
    ]);
  });

  it('sends auth requests exactly as a plain client does', async () => {
    const plainMock = mockFetch();
    const plain = createClient(URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: plainMock.fn },
    });
    await plain.auth.signUp({ email: 'v@x.com', password: 'pw123456' });

    const { fn, seen } = mockFetch();
    const admin = createAdminClient(URL, SERVICE_KEY, fn);
    await admin.auth.signUp({ email: 'v@x.com', password: 'pw123456' });

    const find = (s: { url: string }[]) =>
      s.find((x) => x.url.includes('/auth/v1/signup'));
    expect(find(seen)).toEqual(find(plainMock.seen));
  });
});
