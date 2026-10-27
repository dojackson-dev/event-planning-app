import { nearbyCities, placeForZip, searchPlaces } from './nearby-cities';

describe('nearby cities', () => {
  it('names the city for a zip code', () => {
    expect(placeForZip('39202')).toMatchObject({
      city: 'Jackson',
      state: 'MS',
      zip: '39202',
    });
  });

  it('rejects anything that is not a 5-digit zip', () => {
    expect(placeForZip('3920')).toBeNull();
    expect(placeForZip('abcde')).toBeNull();
    expect(placeForZip('00000')).toBeNull();
    expect(nearbyCities('nope')).toEqual([]);
  });

  it('lists other cities nearest first, one per city, never the origin city', () => {
    const near = nearbyCities('39202', 25, 6);
    expect(near.length).toBeGreaterThan(0);
    expect(near.length).toBeLessThanOrEqual(6);
    const names = near.map((p) => `${p.city}, ${p.state}`);
    expect(new Set(names).size).toBe(names.length);
    expect(names).not.toContain('Jackson, MS');
    const distances = near.map((p) => p.distance);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
    expect(Math.max(...distances)).toBeLessThanOrEqual(25);
  });

  it('keeps limit and radius within sane bounds', () => {
    expect(nearbyCities('39202', 25, 500).length).toBeLessThanOrEqual(12);
    expect(nearbyCities('39202', -5, 3).length).toBeLessThanOrEqual(3);
  });
});

describe('place type-ahead', () => {
  const names = (q: string) =>
    searchPlaces(q).map((p) => `${p.city}, ${p.state}`);

  it('finds a city from a few letters, biggest first, with a zip to search by', () => {
    const r = searchPlaces('jack');
    expect(r.length).toBeGreaterThan(1);
    expect(r.length).toBeLessThanOrEqual(8);
    expect(names('jack')).toContain('Jackson, MS');
    expect(r.every((p) => /^\d{5}$/.test(p.zip))).toBe(true);
    expect(searchPlaces('jackson')[0]).toMatchObject({ city: 'Jackson' });
  });

  it('lists only cities, never counties', () => {
    expect(names('jackson').some((n) => /county/i.test(n))).toBe(false);
  });

  it('narrows by state from a code or a name, with or without a comma', () => {
    for (const q of [
      'jackson, ms',
      'jackson ms',
      'jackson, mississippi',
      'jackson, missi',
    ]) {
      expect(names(q)).toEqual(['Jackson, MS']);
    }
    expect(names('jackson, mi')).toContain('Jackson, MI');
    expect(names('jackson, mi')).not.toContain('Jackson, MS');
  });

  it('handles punctuation, case and exact zip codes', () => {
    expect(names('ST. LOUIS')).toContain('Saint Louis, MO');
    expect(names('ft wor')).toContain('Fort Worth, TX');
    expect(names('ATL')[0]).toBe('Atlanta, GA');
    expect(searchPlaces('39202')).toHaveLength(1);
    expect(searchPlaces('39202')[0]).toMatchObject({
      city: 'Jackson',
      state: 'MS',
    });
  });

  it('returns nothing for too-short, numeric-mixed or unknown text', () => {
    expect(searchPlaces('')).toEqual([]);
    expect(searchPlaces('j')).toEqual([]);
    expect(searchPlaces('3920')).toEqual([]);
    expect(searchPlaces('zzzzqq')).toEqual([]);
  });

  it('keeps the limit within bounds', () => {
    expect(searchPlaces('san', 500).length).toBeLessThanOrEqual(15);
    expect(searchPlaces('san', 3)).toHaveLength(3);
  });
});
