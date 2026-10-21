import { checkSlug, RESERVED_SLUGS } from './auction-slug';

describe('checkSlug', () => {
  it.each(['abc', 'helping-hands', 'gala-2026', 'a1b', 'x'.repeat(60)])(
    'accepts %s',
    (value) => {
      expect(checkSlug(value)).toEqual({ ok: true, slug: value });
    },
  );

  it('trims and lower-cases', () => {
    expect(checkSlug('  Helping-Hands ')).toEqual({
      ok: true,
      slug: 'helping-hands',
    });
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'x'.repeat(61)],
    ['leading hyphen', '-abc'],
    ['trailing hyphen', 'abc-'],
    ['double hyphen', 'a--b'],
    ['underscore', 'a_b_c'],
    ['space', 'a b c'],
    ['slash', 'a/b'],
    ['unicode', 'café'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(checkSlug(value).ok).toBe(false);
  });

  it('rejects non-strings', () => {
    expect(checkSlug(undefined).ok).toBe(false);
    expect(checkSlug(42).ok).toBe(false);
    expect(checkSlug(null).ok).toBe(false);
  });

  it('rejects every reserved word that meets the length rule', () => {
    for (const word of RESERVED_SLUGS) {
      const result = checkSlug(word);
      expect(result.ok).toBe(false);
    }
    const reason = checkSlug('register');
    expect(reason).toEqual({
      ok: false,
      reason: expect.stringMatching(/reserved/i),
    });
  });

  it('rejects UUID-shaped slugs, which select the legacy routes', () => {
    expect(checkSlug('11111111-1111-4111-8111-111111111111').ok).toBe(false);
  });
});
