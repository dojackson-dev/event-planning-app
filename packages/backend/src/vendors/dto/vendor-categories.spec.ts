import { VENDOR_CATEGORIES } from './vendor.dto';

describe('VENDOR_CATEGORIES', () => {
  it('offers caterer and keeps other last', () => {
    const values = VENDOR_CATEGORIES.map((c) => c.value);
    expect(values).toContain('caterer');
    expect(values[values.length - 1]).toBe('other');
  });

  it('has no duplicate values', () => {
    const values = VENDOR_CATEGORIES.map((c) => c.value);
    expect(new Set(values).size).toBe(values.length);
  });
});
