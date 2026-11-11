import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { MailService } from '../mail/mail.service';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import { VendorCatalogService } from './vendor-catalog.service';
import { VendorsService } from '../vendors/vendors.service';

function setup(extra: Record<string, Record<string, unknown>[]> = {}) {
  const db = new FakeDb({
    vendor_accounts: [
      {
        id: 'v1',
        user_id: 'u1',
        business_name: 'Savour',
        phone: '+16015550100',
        is_active: true,
        show_catalog_to_clients: true,
      },
      {
        id: 'v2',
        user_id: 'u2',
        business_name: 'Other',
        is_active: true,
        show_catalog_to_clients: false,
      },
    ],
    vendor_items: [
      {
        id: 'brisket',
        vendor_account_id: 'v1',
        name: 'Brisket',
        section: 'Entrees',
        kind: 'item',
        unit: 'person',
        price: 18,
        hide_price: false,
        is_active: true,
        visible_to_clients: true,
        sort_order: 0,
        description: 'Slow smoked',
        image_url: null,
        created_at: '2026-01-01',
      },
      {
        id: 'mac',
        vendor_account_id: 'v1',
        name: 'Mac & cheese',
        section: 'Sides',
        kind: 'item',
        unit: 'person',
        price: 4,
        hide_price: false,
        is_active: true,
        visible_to_clients: true,
        sort_order: 0,
        created_at: '2026-01-02',
      },
      {
        id: 'server',
        vendor_account_id: 'v1',
        name: 'Server',
        section: null,
        kind: 'item',
        unit: 'hour',
        price: 35,
        hide_price: true,
        is_active: true,
        visible_to_clients: true,
        sort_order: 0,
        created_at: '2026-01-03',
      },
      {
        id: 'old',
        vendor_account_id: 'v1',
        name: 'Retired dish',
        section: 'Entrees',
        kind: 'item',
        unit: 'each',
        price: 9,
        hide_price: false,
        is_active: false,
        visible_to_clients: true,
        sort_order: 0,
        created_at: '2026-01-04',
      },
      {
        id: 'feast',
        vendor_account_id: 'v1',
        name: 'Feast package',
        section: 'Packages',
        kind: 'package',
        unit: 'flat',
        price: 500,
        hide_price: false,
        is_active: true,
        visible_to_clients: true,
        sort_order: 0,
        created_at: '2026-01-05',
      },
      {
        id: 'theirs',
        vendor_account_id: 'v2',
        name: 'Their item',
        section: null,
        kind: 'item',
        unit: 'each',
        price: 5,
        hide_price: false,
        is_active: true,
        visible_to_clients: true,
        sort_order: 0,
        created_at: '2026-01-06',
      },
      {
        id: 'secret',
        vendor_account_id: 'v1',
        name: 'Staff meal',
        section: 'Entrees',
        kind: 'item',
        unit: 'each',
        price: 7,
        hide_price: false,
        visible_to_clients: false,
        is_active: true,
        sort_order: 0,
        created_at: '2026-01-07',
      },
    ],
    vendor_package_items: [
      { package_id: 'feast', item_id: 'brisket', quantity: 20 },
      { package_id: 'feast', item_id: 'mac', quantity: 20 },
    ],
    vendor_booking_links: [
      { id: 'link1', slug: 'savour', vendor_account_id: 'v1', is_active: true },
    ],
    ...extra,
  });
  const supabase = { getAdminClient: () => db } as unknown as SupabaseService;
  const service = new VendorCatalogService(supabase);
  return { db, service, supabase };
}

describe('vendor catalog (vendor side)', () => {
  it('lists my items with package contents and the visibility switch', async () => {
    const { service } = setup();
    const result = await service.list('u1');
    expect(result.show_to_clients).toBe(true);
    expect(result.items.map((i) => i.name)).toEqual([
      'Brisket',
      'Retired dish',
      'Staff meal',
      'Feast package',
      'Mac & cheese',
      'Server',
    ]);
    expect(result.items.find((i) => i.id === 'feast')?.includes).toEqual([
      { item_id: 'brisket', name: 'Brisket', quantity: 20 },
      { item_id: 'mac', name: 'Mac & cheese', quantity: 20 },
    ]);
    expect(result.items.find((i) => i.id === 'theirs')).toBeUndefined();
  });

  it('refuses someone who is not a vendor', async () => {
    const { service } = setup();
    await expect(service.list('nobody')).rejects.toThrow(ForbiddenException);
  });

  it('creates an item and a package that bundles my own items', async () => {
    const { service, db } = setup();
    const item = await service.create('u1', {
      name: 'Peach cobbler',
      unit: 'person',
      price: 6,
      section: 'Desserts',
    });
    expect(item).toMatchObject({
      name: 'Peach cobbler',
      kind: 'item',
      includes: [],
    });
    expect(
      db.rows('vendor_items').find((i) => i.id === item.id)?.vendor_account_id,
    ).toBe('v1');

    const pkg = await service.create('u1', {
      name: 'Dessert bar',
      kind: 'package',
      unit: 'flat',
      price: 150,
      includes: [{ item_id: item.id, quantity: 30 }],
    });
    expect(pkg.includes).toEqual([
      { item_id: item.id, name: 'Peach cobbler', quantity: 30 },
    ]);
  });

  it("does not let a package include another vendor's item or another package", async () => {
    const { service } = setup();
    await expect(
      service.create('u1', {
        name: 'Bad',
        kind: 'package',
        price: 1,
        includes: [{ item_id: 'theirs', quantity: 1 }],
      }),
    ).rejects.toThrow('your own items');
    await expect(
      service.create('u1', {
        name: 'Nested',
        kind: 'package',
        price: 1,
        includes: [{ item_id: 'feast', quantity: 1 }],
      }),
    ).rejects.toThrow('another package');
  });

  it('updates only my own items and replaces package contents', async () => {
    const { service } = setup();
    await expect(service.update('u1', 'theirs', { price: 1 })).rejects.toThrow(
      NotFoundException,
    );
    const updated = await service.update('u1', 'feast', {
      price: 650,
      includes: [{ item_id: 'brisket', quantity: 10 }],
    });
    expect(updated).toMatchObject({
      price: 650,
      includes: [{ item_id: 'brisket', name: 'Brisket', quantity: 10 }],
    });
  });

  it('keeps an invalid edit from changing anything', async () => {
    const { service, db } = setup();
    await expect(
      service.update('u1', 'brisket', { price: -4 }),
    ).rejects.toThrow('price');
    expect(db.rows('vendor_items').find((i) => i.id === 'brisket')?.price).toBe(
      18,
    );
  });

  it("deletes my item but not someone else's", async () => {
    const { service, db } = setup();
    await expect(service.remove('u1', 'theirs')).rejects.toThrow(
      NotFoundException,
    );
    await service.remove('u1', 'mac');
    expect(db.rows('vendor_items').some((i) => i.id === 'mac')).toBe(false);
  });

  it('turns the client menu on and off, rejecting anything but true or false', async () => {
    const { service, db } = setup();
    await service.setVisibility('u1', false);
    expect(db.rows('vendor_accounts')[0].show_catalog_to_clients).toBe(false);
    await expect(service.setVisibility('u1', 'yes')).rejects.toThrow(
      BadRequestException,
    );
  });
});

describe('vendor catalog (public menu)', () => {
  it('shows active items grouped by section, hides hidden prices, and leaves out inactive items', async () => {
    const { service } = setup();
    const menu = await service.getPublicByVendor('v1');
    expect(menu.enabled).toBe(true);
    expect(menu.sections.map((s: any) => s.name)).toEqual([
      'Entrees',
      'Packages',
      'Sides',
      null,
    ]);
    const all = menu.sections.flatMap((s: any) => s.items);
    expect(all.map((i: any) => i.name)).not.toContain('Retired dish');
    expect(all.find((i: any) => i.name === 'Server')).toMatchObject({
      price: null,
      unit_label: 'per hour',
    });
    expect(all.find((i: any) => i.name === 'Brisket')).toMatchObject({
      price: 18,
      unit_label: 'per person',
    });
    expect(all.find((i: any) => i.name === 'Feast package').includes).toEqual([
      { name: 'Brisket', quantity: 20 },
      { name: 'Mac & cheese', quantity: 20 },
    ]);
  });

  it('never exposes internal fields', async () => {
    const { service } = setup();
    const item = (await service.getPublicByVendor('v1')).sections[0].items[0];
    expect(Object.keys(item).sort()).toEqual([
      'description',
      'id',
      'image_url',
      'includes',
      'kind',
      'name',
      'price',
      'unit',
      'unit_label',
    ]);
  });

  it('shows nothing for a vendor who has not turned the menu on, and for an unknown vendor', async () => {
    const { service } = setup();
    expect(await service.getPublicByVendor('v2')).toEqual({
      enabled: false,
      vendor_id: 'v2',
      sections: [],
    });
    expect((await service.getPublicByVendor('missing')).enabled).toBe(false);
  });

  it('finds the menu through a booking link slug', async () => {
    const { service } = setup();
    expect((await service.getPublicBySlug('savour')).enabled).toBe(true);
    await expect(service.getPublicBySlug('nope')).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('snapshotRequestedItems', () => {
  it('stores names, units and the price at request time, with hidden prices left blank', async () => {
    const { service } = setup();
    const snapshot = await service.snapshotRequestedItems('v1', [
      { item_id: 'brisket', quantity: 40 },
      { item_id: 'server', quantity: 5 },
      { item_id: 'feast', quantity: 1 },
    ]);
    expect(snapshot).toEqual([
      expect.objectContaining({
        item_id: 'brisket',
        name: 'Brisket',
        unit: 'person',
        quantity: 40,
        unit_price: 18,
      }),
      expect.objectContaining({
        item_id: 'server',
        unit: 'hour',
        quantity: 5,
        unit_price: null,
      }),
      expect.objectContaining({
        item_id: 'feast',
        kind: 'package',
        unit_price: 500,
        includes: [
          { name: 'Brisket', quantity: 20 },
          { name: 'Mac & cheese', quantity: 20 },
        ],
      }),
    ]);
  });

  it('returns nothing when nothing was picked', async () => {
    const { service } = setup();
    expect(await service.snapshotRequestedItems('v1', [])).toEqual([]);
    expect(await service.snapshotRequestedItems('v1', undefined)).toEqual([]);
  });

  it("refuses another vendor's item, an inactive item and an unknown item", async () => {
    const { service } = setup();
    for (const id of ['theirs', 'old', 'ghost']) {
      await expect(
        service.snapshotRequestedItems('v1', [{ item_id: id, quantity: 1 }]),
      ).rejects.toThrow('no longer available');
    }
  });

  it('refuses picks when the vendor keeps the menu off', async () => {
    const { service } = setup();
    await expect(
      service.snapshotRequestedItems('v2', [
        { item_id: 'theirs', quantity: 1 },
      ]),
    ).rejects.toThrow('not taking item selections');
  });

  it('refuses invalid quantities', async () => {
    const { service } = setup();
    await expect(
      service.snapshotRequestedItems('v1', [
        { item_id: 'brisket', quantity: -3 },
      ]),
    ).rejects.toThrow('quantity');
  });
});

describe('client request paths store the snapshot', () => {
  function vendorsService(db: FakeDb, catalog: VendorCatalogService) {
    return new VendorsService(
      { getAdminClient: () => db } as unknown as SupabaseService,
      {
        vendorBookingCreated: jest.fn().mockResolvedValue(undefined),
      } as unknown as SmsNotificationsService,
      {} as unknown as MailService,
      catalog,
    );
  }

  it('saves the picked items on a public inquiry', async () => {
    const { db, service } = setup();
    const vendors = vendorsService(db, service);
    await vendors.submitPublicInquiry('v1', {
      clientName: 'Ann',
      clientEmail: 'ann@example.com',
      eventName: 'Staff luncheon',
      eventDate: '2026-12-01',
      items: [{ item_id: 'brisket', quantity: 40 }],
    });
    const saved = db.rows('vendor_booking_requests')[0];
    expect(saved.requested_items).toEqual([
      expect.objectContaining({
        item_id: 'brisket',
        quantity: 40,
        unit_price: 18,
      }),
    ]);
  });

  it('saves the picked items through a booking link', async () => {
    const { db, service } = setup();
    const vendors = vendorsService(db, service);
    await vendors.submitBookingRequest('savour', {
      clientName: 'Ann',
      clientEmail: 'ann@example.com',
      clientPhone: '6015550111',
      eventName: 'Party',
      items: [{ item_id: 'mac', quantity: 30 }],
    });
    expect(db.rows('vendor_booking_requests')[0].requested_items).toEqual([
      expect.objectContaining({ item_id: 'mac', quantity: 30 }),
    ]);
  });

  it('still takes a plain request with no items, and rejects a request with a forged item', async () => {
    const { db, service } = setup();
    const vendors = vendorsService(db, service);
    await vendors.submitPublicInquiry('v1', {
      clientName: 'Bob',
      clientEmail: 'bob@example.com',
      eventName: 'Party',
      eventDate: '2026-12-02',
    });
    expect(db.rows('vendor_booking_requests')[0].requested_items).toBeNull();

    await expect(
      vendors.submitPublicInquiry('v1', {
        clientName: 'Eve',
        clientEmail: 'eve@example.com',
        eventName: 'Party',
        eventDate: '2026-12-03',
        items: [{ item_id: 'theirs', quantity: 1 }],
      }),
    ).rejects.toThrow('no longer available');
    expect(db.rows('vendor_booking_requests')).toHaveLength(1);
  });
});

describe('keeping an item private from clients', () => {
  it('still lists a private item for the vendor and defaults new items to visible', async () => {
    const { service } = setup();
    const mine = await service.list('u1');
    expect(mine.items.find((i) => i.id === 'secret')).toMatchObject({
      visible_to_clients: false,
    });
    const created = await service.create('u1', { name: 'New thing', price: 3 });
    expect(created.visible_to_clients).toBe(true);
  });

  it('leaves a private item off the public menu', async () => {
    const { service } = setup();
    const menu = await service.getPublicByVendor('v1');
    const names = menu.sections.flatMap((s: any) =>
      s.items.map((i: any) => i.name),
    );
    expect(names).not.toContain('Staff meal');
    expect(names).toContain('Brisket');
  });

  it('refuses a request for a private item even if the client guesses its id', async () => {
    const { service } = setup();
    await expect(
      service.snapshotRequestedItems('v1', [
        { item_id: 'secret', quantity: 1 },
      ]),
    ).rejects.toThrow('no longer available');
  });

  it('can be switched on and off by the vendor, and only with true or false', async () => {
    const { service } = setup();
    await service.update('u1', 'brisket', { visible_to_clients: false });
    const hidden = await service.getPublicByVendor('v1');
    expect(
      hidden.sections.flatMap((s: any) => s.items.map((i: any) => i.name)),
    ).not.toContain('Brisket');

    await service.update('u1', 'secret', { visible_to_clients: true });
    const shown = await service.getPublicByVendor('v1');
    expect(
      shown.sections.flatMap((s: any) => s.items.map((i: any) => i.name)),
    ).toContain('Staff meal');

    await expect(
      service.update('u1', 'brisket', { visible_to_clients: 'no' }),
    ).rejects.toThrow('visible_to_clients');
  });
});
