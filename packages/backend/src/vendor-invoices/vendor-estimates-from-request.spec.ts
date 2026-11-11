import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorEstimatesService } from './vendor-estimates.service';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { FakeDb } from './test-support/fake-db';

const snapshot = [
  {
    item_id: 'brisket',
    name: 'Brisket',
    kind: 'item',
    unit: 'person',
    quantity: 40,
    unit_price: 18,
    description: null,
    includes: [],
  },
  {
    item_id: 'server',
    name: 'Server',
    kind: 'item',
    unit: 'hour',
    quantity: 5,
    unit_price: null,
    description: null,
    includes: [],
  },
  {
    item_id: 'feast',
    name: 'Feast package',
    kind: 'package',
    unit: 'flat',
    quantity: 1,
    unit_price: 500,
    description: null,
    includes: [
      { name: 'Cake', quantity: 1 },
      { name: 'Cupcakes', quantity: 24 },
    ],
  },
];

function setup(request: Record<string, unknown> | null = {}) {
  const db = new FakeDb({
    vendor_accounts: [
      { id: 'v1', user_id: 'u1', business_name: 'Savour' },
      { id: 'v2', user_id: 'u2', business_name: 'Other' },
    ],
    vendor_items: [
      { id: 'server', vendor_account_id: 'v1', name: 'Server', price: 35 },
    ],
    vendor_booking_requests: request
      ? [
          {
            id: 'r1',
            vendor_account_id: 'v1',
            status: 'pending',
            client_name: 'Ann Lee',
            client_email: 'ann@example.com',
            client_phone: '+16015550111',
            notes: 'Allergy: nuts',
            estimate_id: null,
            requested_items: snapshot,
            ...request,
          },
        ]
      : [],
  });
  const supabase = { getAdminClient: () => db } as unknown as SupabaseService;
  const config = {
    get: (key: string, fallback?: string) =>
      key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
  } as unknown as ConfigService;
  const invoices = new VendorInvoicesService(
    supabase,
    config,
    {} as unknown as SmsNotificationsService,
  );
  const service = new VendorEstimatesService(
    supabase,
    config,
    {} as unknown as SmsNotificationsService,
    invoices,
  );
  return { db, service };
}

describe('createFromRequest', () => {
  it('builds a draft estimate with one line per picked item', async () => {
    const { db, service } = setup();
    const result = await service.createFromRequest('u1', 'r1');

    expect(result).toMatchObject({ already: false });
    const estimate = db.rows('vendor_estimates')[0];
    expect(estimate).toMatchObject({
      status: 'draft',
      client_name: 'Ann Lee',
      client_email: 'ann@example.com',
      client_phone: '+16015550111',
      notes: 'Client notes: Allergy: nuts',
      booking_request_id: 'r1',
      // 40 x 18 + 5 x 35 (current price for the hidden one) + 500
      subtotal: 1395,
      total_amount: 1395,
    });
    const lines = db
      .rows('vendor_estimate_items')
      .map((i) => [i.description, Number(i.quantity), Number(i.unit_price)]);
    expect(lines).toEqual([
      ['Brisket (per person)', 40, 18],
      ['Server (per hour)', 5, 35],
      ['Feast package (flat fee) — includes: Cake, Cupcakes ×24', 1, 500],
    ]);
    expect(db.rows('vendor_booking_requests')[0].estimate_id).toBe(
      result.estimate_id,
    );
  });

  it('flags items that still need a price when the catalog price is gone', async () => {
    const { db, service } = setup();
    db.tables.vendor_items = [];
    const result = (await service.createFromRequest('u1', 'r1')) as {
      needs_pricing?: number;
    };
    expect(result.needs_pricing).toBe(1);
  });

  it('returns the same estimate when asked twice', async () => {
    const { db, service } = setup();
    const first = await service.createFromRequest('u1', 'r1');
    const second = await service.createFromRequest('u1', 'r1');
    expect(second).toEqual({ estimate_id: first.estimate_id, already: true });
    expect(db.rows('vendor_estimates')).toHaveLength(1);
  });

  it('makes a new one if the earlier estimate was deleted', async () => {
    const { db, service } = setup();
    const first = await service.createFromRequest('u1', 'r1');
    await service.remove('u1', first.estimate_id);
    db.rows('vendor_booking_requests')[0].estimate_id = first.estimate_id;
    const again = await service.createFromRequest('u1', 'r1');
    expect(again.already).toBe(false);
    expect(db.rows('vendor_estimates')).toHaveLength(1);
  });

  it("will not touch another vendor's request", async () => {
    const { service } = setup();
    await expect(service.createFromRequest('u2', 'r1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it.each(['declined', 'cancelled'])('refuses a %s request', async (status) => {
    const { service } = setup({ status });
    await expect(service.createFromRequest('u1', 'r1')).rejects.toThrow(
      'cannot become an estimate',
    );
  });

  it('refuses a request that has no picked items', async () => {
    const { service } = setup({ requested_items: null });
    await expect(service.createFromRequest('u1', 'r1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('works when the client left no email (client portal bookings)', async () => {
    const { db, service } = setup({ client_email: '' });
    await service.createFromRequest('u1', 'r1');
    expect(db.rows('vendor_estimates')[0].client_email).toBeNull();
  });
});
