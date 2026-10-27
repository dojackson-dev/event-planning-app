import { sanitizeSearchTerm } from './search-term';

describe('sanitizeSearchTerm', () => {
  it('keeps a normal name search', () => {
    expect(sanitizeSearchTerm('Desi Banks')).toBe('Desi Banks');
  });

  it('strips characters that would break or widen a PostgREST filter', () => {
    expect(sanitizeSearchTerm('a%b,c(d)e*f')).toBe('a b c d e f');
    expect(sanitizeSearchTerm('x),title.ilike.%')).toBe('x title.ilike.');
  });

  it('collapses whitespace and caps the length', () => {
    expect(sanitizeSearchTerm('  desi    banks ')).toBe('desi banks');
    expect(sanitizeSearchTerm('a'.repeat(200))).toHaveLength(80);
  });

  it('returns empty for missing or too-short terms', () => {
    expect(sanitizeSearchTerm(undefined)).toBe('');
    expect(sanitizeSearchTerm(' a ')).toBe('');
    expect(sanitizeSearchTerm('%%')).toBe('');
  });
});
