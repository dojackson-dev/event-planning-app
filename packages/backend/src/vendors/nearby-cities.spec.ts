import { nearbyCities, placeForZip } from './nearby-cities';

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
