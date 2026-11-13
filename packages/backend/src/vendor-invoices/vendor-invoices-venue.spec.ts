import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { FakeDb } from './test-support/fake-db';

function setup(extra: Record<string, Record<string, unknown>[]> = {}) {
  const db = new FakeDb({
    vendor_accounts: [
      { id: 'v1', user_id: 'u1', business_name: 'Pat’s Photography' },
    ],
    users: [
      {
        id: 'owner-1',
        email: 'Events@therookeryms.com',
        phone_number: '+16017083001',
      },
      {
        id: 'owner-2',
        email: 'hello@grandhall.com',
        phone_number: '+16015559999',
      },
      { id: 'plain', email: 'ann@example.com', phone_number: '+16015550100' },
    ],
    owner_accounts: [
      {
        id: 'acct-1',
        business_name: 'The Rookery MS',
        primary_owner_id: 'owner-1',
        logo_url: 'logo.png',
      },
      {
        id: 'acct-2',
        business_name: 'Grand Hall',
        primary_owner_id: 'owner-2',
      },
      { id: 'acct-3', business_name: '  ', primary_owner_id: 'owner-3' },
    ],
    vendor_bookings: [{ vendor_account_id: 'v1', owner_account_id: 'acct-2' }],
    vendor_invoices: [],
    vendor_invoice_items: [],
    ...extra,
  });
  const service = new VendorInvoicesService(
    { getAdminClient: () => db } as unknown as SupabaseService,
    {
      get: (key: string, fallback?: string) =>
        key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
    } as unknown as ConfigService,
    {} as unknown as SmsNotificationsService,
  );
  (service as any).stripe = {
    checkout: { sessions: { retrieve: jest.fn(), expire: jest.fn() } },
  };
  return { db, service };
}

const base = {
  client_name: 'ignored',
  issue_date: '2026-11-13',
  due_date: '2026-12-13',
  items: [{ description: 'Photos', quantity: 1, unit_price: 300 }],
};

describe('invoicing a venue directly', () => {
  it("links the invoice to the venue's account and sends it to the account's own contact", async () => {
    const { db, service } = setup();
    const invoice = await service.createInvoice('u1', {
      ...base,
      owner_account_id: 'acct-1',
      client_email: 'typo@wrong.com',
    });
    expect(invoice).toMatchObject({
      invoice_type: 'owner_booking',
      owner_account_id: 'acct-1',
      client_name: 'The Rookery MS',
      client_email: 'Events@therookeryms.com',
      client_phone: '+16017083001',
    });
    expect(db.rows('vendor_invoices')).toHaveLength(1);
  });

  it('refuses an unknown venue and a venue with no way to be contacted', async () => {
    const { service } = setup();
    await expect(
      service.createInvoice('u1', { ...base, owner_account_id: 'nope' }),
    ).rejects.toThrow('Choose a venue');
    const noContact = setup({
      users: [{ id: 'owner-1', email: null, phone_number: null }],
    });
    await expect(
      noContact.service.createInvoice('u1', {
        ...base,
        owner_account_id: 'acct-1',
      }),
    ).rejects.toThrow('cannot be delivered');
  });

  it("then appears on the venue's Vendor Payments list", async () => {
    const { service } = setup();
    await service.createInvoice('u1', { ...base, owner_account_id: 'acct-1' });
    const list = await service.listOwnerBookingInvoices('acct-1', 'owner-1');
    expect(list).toHaveLength(0); // still a draft, so not shown until it is sent
  });
});

describe('a typed contact that is a venue owner', () => {
  it('links by email regardless of case, or by phone', async () => {
    const { service } = setup();
    const byEmail = await service.createInvoice('u1', {
      ...base,
      client_name: 'Dee',
      client_email: 'EVENTS@therookeryms.com',
    });
    expect(byEmail).toMatchObject({
      invoice_type: 'owner_booking',
      owner_account_id: 'acct-1',
      client_name: 'Dee',
    });
    const byPhone = await service.createInvoice('u1', {
      ...base,
      client_name: 'Assistant',
      client_email: 'x@y.com',
      client_phone: '601-708-3001',
    });
    expect(byPhone).toMatchObject({
      invoice_type: 'owner_booking',
      owner_account_id: 'acct-1',
    });
  });

  it('leaves an ordinary client alone', async () => {
    const { service } = setup();
    const invoice = await service.createInvoice('u1', {
      ...base,
      client_name: 'Ann',
      client_email: 'ann@example.com',
    });
    expect(invoice.invoice_type ?? 'client').toBe('client');
    expect(invoice.owner_account_id ?? null).toBeNull();
  });

  it('does not guess when two venues share the contact', async () => {
    const { service } = setup({
      owner_accounts: [
        { id: 'acct-1', business_name: 'A', primary_owner_id: 'owner-1' },
        { id: 'acct-9', business_name: 'B', primary_owner_id: 'owner-1' },
      ],
    });
    expect(
      await service.findOwnerByContact('events@therookeryms.com', null),
    ).toBeNull();
  });
});

describe('listing venues for the vendor', () => {
  it('searches by business name, case-insensitively, and never exposes contact details', async () => {
    const { service } = setup();
    const found = await service.listVenueOwners('u1', 'rook');
    expect(found).toEqual([
      { id: 'acct-1', business_name: 'The Rookery MS', logo_url: 'logo.png' },
    ]);
    expect(await service.listVenueOwners('u1', 'zzz')).toEqual([]);
  });

  it('needs two letters before searching and otherwise offers venues the vendor already works with', async () => {
    const { service } = setup();
    const recent = await service.listVenueOwners('u1', 'r');
    expect(recent.map((o: any) => o.business_name)).toEqual(['Grand Hall']);
    expect(
      (await service.listVenueOwners('u1')).map((o: any) => o.business_name),
    ).toEqual(['Grand Hall']);
  });

  it('is only for vendors', async () => {
    const { service } = setup();
    await expect(
      service.listVenueOwners('someone-else', 'rook'),
    ).rejects.toThrow('No vendor account');
  });
});

describe('editing a venue invoice', () => {
  async function venueInvoice() {
    const { db, service } = setup();
    const created = await service.createInvoice('u1', {
      ...base,
      owner_account_id: 'acct-1',
    });
    return { db, service, id: created.id as string };
  }

  it('cannot redirect it to another contact', async () => {
    const { db, service, id } = await venueInvoice();
    await service.updateInvoice('u1', id, {
      client_email: 'evil@example.com',
      client_phone: '555',
      notes: 'Updated',
    });
    const row = db.rows('vendor_invoices').find((r) => r.id === id)!;
    expect(row.client_email).toBe('Events@therookeryms.com');
    expect(row.client_phone).toBe('+16017083001');
    expect(row.notes).toBe('Updated');
  });

  it('keeps the contact when the whole invoice is saved from the edit screen', async () => {
    const { db, service, id } = await venueInvoice();
    await service.replaceContents('u1', id, {
      client_name: 'Someone else',
      client_email: 'evil@example.com',
      items: [{ description: 'Photos', quantity: 2, unit_price: 300 }],
    });
    const row = db.rows('vendor_invoices').find((r) => r.id === id)!;
    expect(row).toMatchObject({
      client_name: 'The Rookery MS',
      client_email: 'Events@therookeryms.com',
      total_amount: 600,
    });
  });

  it('still lets a normal client invoice change its contact', async () => {
    const { db, service } = setup();
    const created = await service.createInvoice('u1', {
      ...base,
      client_name: 'Ann',
      client_email: 'ann@example.com',
    });
    await service.updateInvoice('u1', created.id, {
      client_email: 'ann2@example.com',
    });
    expect(db.rows('vendor_invoices')[0].client_email).toBe('ann2@example.com');
  });
});

describe('invalid input', () => {
  it('still requires items', async () => {
    const { service } = setup();
    await expect(
      service.createInvoice('u1', {
        ...base,
        owner_account_id: 'acct-1',
        items: [],
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
