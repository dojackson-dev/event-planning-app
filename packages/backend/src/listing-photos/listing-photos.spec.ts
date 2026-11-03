import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ListingPhotosService } from './listing-photos.service';
import { isOwnGalleryUrl, mergePhotos } from './photos';

const SUPA = 'https://proj.supabase.co';
const own = (n: number) =>
  `${SUPA}/storage/v1/object/public/vendor-images/gallery/u-${n}.webp`;

describe('mergePhotos', () => {
  it('puts uploaded photos first, then the cover, without duplicates', () => {
    expect(mergePhotos(['a', 'b'], ['cover', 'a'], 'logo')).toEqual([
      'a',
      'b',
      'cover',
    ]);
  });

  it('caps at 5 photos', () => {
    expect(mergePhotos(['1', '2', '3', '4', '5', '6'], ['7'])).toHaveLength(5);
  });

  it('uses the logo only when there is nothing else', () => {
    expect(mergePhotos([], [null, undefined], 'logo')).toEqual(['logo']);
    expect(mergePhotos([], ['cover'], 'logo')).toEqual(['cover']);
  });

  it('is empty (placeholder) with no photos and no logo', () => {
    expect(mergePhotos([], [null], null)).toEqual([]);
  });
});

describe('isOwnGalleryUrl', () => {
  it('accepts only files our upload endpoint stored', () => {
    expect(isOwnGalleryUrl(own(1), SUPA)).toBe(true);
    expect(isOwnGalleryUrl(own(1), `${SUPA}/`)).toBe(true);
  });

  it.each([
    'https://evil.example/storage/v1/object/public/vendor-images/gallery/a.webp',
    `${SUPA}/storage/v1/object/public/other-bucket/gallery/a.webp`,
    `${SUPA}/storage/v1/object/public/vendor-images/logos/a.webp`,
    `${SUPA}/storage/v1/object/public/vendor-images/gallery/a b.webp`,
    42,
    null,
  ])('rejects %p', (url) => {
    expect(isOwnGalleryUrl(url, SUPA)).toBe(false);
  });
});

/** Chainable fake of the Supabase admin client, keyed by table. */
function fakeAdmin(tables: Record<string, any>) {
  const calls: Record<string, any[]> = {};
  const from = (table: string) => {
    const cfg = tables[table] ?? {};
    const q: any = {};
    for (const m of ['select', 'in', 'order', 'eq', 'not', 'limit', 'delete']) {
      q[m] = jest.fn(() => q);
    }
    q.insert = jest.fn((row: any) => {
      (calls[table] ??= []).push(row);
      return Promise.resolve({ error: cfg.insertError ?? null });
    });
    q.maybeSingle = jest.fn(() =>
      Promise.resolve({ data: cfg.single ?? null, error: null }),
    );
    // awaiting the chain itself resolves the list query
    q.then = (resolve: any) =>
      resolve({ data: cfg.rows ?? [], error: cfg.error ?? null });
    return q;
  };
  return { client: { from }, calls };
}

function serviceWith(admin: any) {
  const supabase: any = { getAdminClient: () => admin };
  const config: any = { get: () => SUPA };
  return new ListingPhotosService(supabase, config);
}

describe('ListingPhotosService.attachPhotos', () => {
  it('gives each card up to 5 photos, uploaded ones first', async () => {
    const { client } = fakeAdmin({
      vendor_gallery: {
        rows: [
          { vendor_account_id: 'v1', image_url: 'g1' },
          { vendor_account_id: 'v1', image_url: 'g2' },
        ],
      },
      venue_photos: { rows: [] },
    });
    const result = await serviceWith(client).attachPhotos({
      vendors: [
        { id: 'v1', cover_image_url: 'cover', profile_image_url: 'logo' },
        { id: 'v2', profile_image_url: 'logo2' },
        { id: 'v3' },
      ],
      venues: [{ id: 7, cover_image_url: 'vcover' }, { id: 8 }],
    });
    expect(result.vendors.map((v) => v.photos)).toEqual([
      ['g1', 'g2', 'cover'],
      ['logo2'],
      [],
    ]);
    expect(result.venues.map((v) => v.photos)).toEqual([['vcover'], []]);
  });

  it('still returns listings when the photo table is missing', async () => {
    const { client } = fakeAdmin({
      vendor_gallery: { error: { message: 'no table' } },
      venue_photos: { error: { message: 'no table' } },
    });
    const result = await serviceWith(client).attachPhotos({
      vendors: [{ id: 'v1', cover_image_url: 'cover' }],
      venues: [{ id: 'x' }],
    });
    expect(result.vendors[0].photos).toEqual(['cover']);
    expect(result.venues[0].photos).toEqual([]);
  });
});

describe('ListingPhotosService management', () => {
  const vendorRows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `p${i}`, image_url: own(i) }));

  it('rejects a photo that was not uploaded through our endpoint', async () => {
    const { client } = fakeAdmin({
      vendor_accounts: { single: { id: 'va1' } },
    });
    await expect(
      serviceWith(client).addVendorPhoto('u1', 'https://evil.example/a.jpg'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses a sixth photo', async () => {
    const { client } = fakeAdmin({
      vendor_accounts: { single: { id: 'va1' } },
      vendor_gallery: { rows: vendorRows(5) },
    });
    await expect(
      serviceWith(client).addVendorPhoto('u1', own(99)),
    ).rejects.toThrow('up to 5 photos');
  });

  it('adds a photo at the end of the order', async () => {
    const { client, calls } = fakeAdmin({
      vendor_accounts: { single: { id: 'va1' } },
      vendor_gallery: { rows: vendorRows(2) },
    });
    await serviceWith(client).addVendorPhoto('u1', own(99));
    expect(calls.vendor_gallery[0]).toMatchObject({
      vendor_account_id: 'va1',
      image_url: own(99),
      display_order: 2,
    });
  });

  it('needs a vendor account', async () => {
    const { client } = fakeAdmin({});
    await expect(
      serviceWith(client).listVendorPhotos('nobody'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("does not let someone manage another owner's venue", async () => {
    const { client } = fakeAdmin({
      memberships: { single: { owner_account_id: 'oa1' } },
      venues: { single: null },
    });
    await expect(
      serviceWith(client).addVenuePhoto('u1', 'venue-of-someone-else', own(1)),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets an owner add a photo to their own venue', async () => {
    const { client, calls } = fakeAdmin({
      memberships: { single: { owner_account_id: 'oa1' } },
      venues: { single: { id: 'venue1' } },
      venue_photos: { rows: [] },
    });
    await serviceWith(client).addVenuePhoto('u1', 'venue1', own(1));
    expect(calls.venue_photos[0]).toMatchObject({
      venue_id: 'venue1',
      image_url: own(1),
      display_order: 0,
    });
  });
});
