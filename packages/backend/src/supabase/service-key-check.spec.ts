import { checkServiceRoleKey, describeServiceKey } from './service-key-check';

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const url = 'https://abcdefgh.supabase.co';
const anon = jwt({ role: 'anon', ref: 'abcdefgh' });
const service = jwt({ role: 'service_role', ref: 'abcdefgh' });

const check = (serviceKey: string | undefined, production = true) =>
  checkServiceRoleKey({ url, anonKey: anon, serviceKey, production });

describe('checkServiceRoleKey', () => {
  it('accepts a service_role key for the same project', () => {
    expect(check(service)).toBeNull();
  });

  it('rejects the anon key in the admin slot, however it got there', () => {
    expect(check(anon)).toMatch(/same as SUPABASE_ANON_KEY/);
    expect(check(jwt({ role: 'anon', ref: 'abcdefgh' }) + '')).toMatch(
      /same as SUPABASE_ANON_KEY|"anon" role/,
    );
    expect(check(jwt({ role: 'authenticated', ref: 'abcdefgh' }))).toMatch(
      /"authenticated" role/,
    );
  });

  it('rejects a key from a different project', () => {
    const demo = jwt({ role: 'service_role', ref: 'otherproject' });
    expect(check(demo)).toMatch(/belongs to project "otherproject"/);
  });

  it('rejects stray whitespace, such as a pasted line break', () => {
    expect(check(`${service}\n`)).toMatch(/whitespace/);
  });

  it('rejects publishable keys and accepts new-style secret keys', () => {
    expect(check('sb_publishable_abc')).toMatch(/publishable/);
    expect(check('sb_secret_abc')).toBeNull();
  });

  it('requires a key in production but lets local development run without one', () => {
    expect(check(undefined, true)).toMatch(/not set/);
    expect(check(undefined, false)).toBeNull();
  });

  it('only rejects an unrecognised key format in production', () => {
    expect(check('not-a-jwt', true)).toMatch(/not a valid Supabase key/);
    expect(check('not-a-jwt', false)).toBeNull();
  });
});

describe('describeServiceKey', () => {
  it('reads the role and project from the key without exposing the key', () => {
    expect(describeServiceKey(service)).toEqual({
      role: 'service_role',
      projectRef: 'abcdefgh',
    });
    expect(describeServiceKey('sb_secret_abc')).toEqual({
      role: null,
      projectRef: null,
    });
  });
});
