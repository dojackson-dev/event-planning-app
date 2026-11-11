import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { FakeDb } from './test-support/fake-db';

function setup(
  invoice: Record<string, unknown> = {},
  session?: Record<string, unknown>,
) {
  const db = new FakeDb({
    vendor_accounts: [{ id: 'v1', user_id: 'u1', business_name: 'Savour' }],
    vendor_invoices: [
      {
        id: 'inv1',
        vendor_account_id: 'v1',
        invoice_number: 'VINV-2026-00001',
        status: 'sent',
        client_name: 'Ann',
        due_date: '2030-01-31',
        tax_rate: 0,
        discount_amount: 0,
        subtotal: 100,
        tax_amount: 0,
        total_amount: 100,
        amount_due: 100,
        amount_paid: 0,
        deposit_amount: null,
        stripe_checkout_session_id: 'cs_open',
        pending_credit_cents: null,
        ...invoice,
      },
    ],
    vendor_invoice_items: [
      {
        id: 'i1',
        vendor_invoice_id: 'inv1',
        description: 'Plates',
        quantity: 10,
        unit_price: 10,
        amount: 100,
      },
    ],
  });
  const stripe = {
    checkout: {
      sessions: {
        retrieve: jest
          .fn()
          .mockResolvedValue(
            session ?? { status: 'open', payment_status: 'unpaid' },
          ),
        expire: jest.fn().mockResolvedValue({}),
      },
    },
  };
  const service = new VendorInvoicesService(
    { getAdminClient: () => db } as unknown as SupabaseService,
    {
      get: (key: string, fallback?: string) =>
        key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
    } as unknown as ConfigService,
    {} as unknown as SmsNotificationsService,
  );
  (service as any).stripe = stripe;
  return { db, service, stripe };
}

const invoiceRow = (db: FakeDb) => db.rows('vendor_invoices')[0];

describe('editing an invoice after it was sent', () => {
  it('adds an item, recalculates the total and expires the checkout the client had open', async () => {
    const { db, service, stripe } = setup();
    await service.addItem('u1', 'inv1', {
      description: 'Delivery',
      quantity: 1,
      unit_price: 25,
    });

    expect(invoiceRow(db)).toMatchObject({
      total_amount: 125,
      amount_due: 125,
      subtotal: 125,
    });
    expect(db.rows('vendor_invoice_items')).toHaveLength(2);
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith('cs_open');
    expect(invoiceRow(db).stripe_checkout_session_id).toBeNull();
  });

  it.each(['paid', 'processing', 'cancelled'])(
    'refuses to edit a %s invoice',
    async (status) => {
      const { db, service } = setup({ status });
      await expect(
        service.addItem('u1', 'inv1', {
          description: 'Extra',
          quantity: 1,
          unit_price: 5,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(db.rows('vendor_invoice_items')).toHaveLength(1);
    },
  );

  it('refuses when Stripe already shows the open checkout as paid', async () => {
    const { db, service } = setup(
      {},
      { status: 'complete', payment_status: 'paid' },
    );
    await expect(
      service.addItem('u1', 'inv1', {
        description: 'Extra',
        quantity: 1,
        unit_price: 5,
      }),
    ).rejects.toThrow('A payment was just received');
    expect(db.rows('vendor_invoice_items')).toHaveLength(1);
  });

  it('does not touch Stripe while the invoice is still a draft', async () => {
    const { service, stripe } = setup({
      status: 'draft',
      stripe_checkout_session_id: null,
    });
    await service.addItem('u1', 'inv1', {
      description: 'Extra',
      quantity: 1,
      unit_price: 5,
    });
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it('will not remove the last item of a sent invoice', async () => {
    const { db, service } = setup();
    await expect(service.deleteItem('u1', 'i1')).rejects.toThrow(
      'at least one line item',
    );
    expect(db.rows('vendor_invoice_items')).toHaveLength(1);
  });

  it('will not drop the total below what was already paid', async () => {
    const { service } = setup({
      deposit_amount: 40,
      amount_paid: 40,
      amount_due: 60,
    });
    await expect(
      service.updateItem('u1', 'i1', { unit_price: 3 }),
    ).rejects.toThrow('cannot be less than the amount already paid');
  });

  it('rejects a negative price or an empty description', async () => {
    const { service } = setup();
    await expect(
      service.addItem('u1', 'inv1', {
        description: 'Bad',
        quantity: 1,
        unit_price: -5,
      }),
    ).rejects.toThrow('unit price');
    await expect(
      service.addItem('u1', 'inv1', {
        description: '  ',
        quantity: 1,
        unit_price: 5,
      }),
    ).rejects.toThrow('description');
  });

  it('recalculates the total when tax is changed', async () => {
    const { db, service } = setup();
    await service.updateInvoice('u1', 'inv1', { tax_rate: 10 });
    expect(invoiceRow(db)).toMatchObject({
      tax_rate: 10,
      tax_amount: 10,
      total_amount: 110,
      amount_due: 110,
    });
  });

  it("keeps another vendor out of someone else's invoice", async () => {
    const { service } = setup({ vendor_account_id: 'someone-else' });
    await expect(
      service.addItem('u1', 'inv1', {
        description: 'x',
        quantity: 1,
        unit_price: 1,
      }),
    ).rejects.toThrow('Invoice not found');
  });
});

describe('replaceContents', () => {
  it('replaces, edits, adds and removes items in one save on a sent invoice', async () => {
    const { db, service } = setup();
    db.rows('vendor_invoice_items').push({
      id: 'i2',
      vendor_invoice_id: 'inv1',
      description: 'Old extra',
      quantity: 1,
      unit_price: 5,
      amount: 5,
    });
    await service.replaceContents('u1', 'inv1', {
      notes: 'Updated',
      items: [
        { id: 'i1', description: 'Plates', quantity: 12, unit_price: 10 },
        { description: 'Dessert table', quantity: 2, unit_price: 40 },
      ],
    });

    const items = db.rows('vendor_invoice_items');
    expect(items.map((i) => i.description).sort()).toEqual([
      'Dessert table',
      'Plates',
    ]);
    expect(invoiceRow(db)).toMatchObject({
      subtotal: 200,
      total_amount: 200,
      amount_due: 200,
      notes: 'Updated',
    });
    expect(invoiceRow(db).stripe_checkout_session_id).toBeNull();
  });

  it('leaves the invoice untouched when the edit is invalid', async () => {
    const { db, service } = setup();
    await expect(
      service.replaceContents('u1', 'inv1', {
        items: [{ description: 'Free', quantity: 1, unit_price: 0 }],
      }),
    ).rejects.toThrow('greater than zero');
    expect(invoiceRow(db).total_amount).toBe(100);
    expect(db.rows('vendor_invoice_items')).toHaveLength(1);
  });

  it('rejects an item id that is not on the invoice', async () => {
    const { service } = setup();
    await expect(
      service.replaceContents('u1', 'inv1', {
        items: [{ id: 'nope', description: 'x', quantity: 1, unit_price: 1 }],
      }),
    ).rejects.toThrow('no longer exists');
  });
});

describe('creating an invoice', () => {
  const base = {
    client_name: 'Ann',
    issue_date: '2026-11-11',
    due_date: '2026-12-11',
    items: [
      { description: 'Plates', quantity: 10, unit_price: 12.5 },
      { description: 'Delivery', quantity: 1, unit_price: 20 },
    ],
  };

  it('saves every itemized line with the right total', async () => {
    const { db, service } = setup();
    const created = await service.createInvoice('u1', base);
    expect(created.total_amount).toBe(145);
    expect(
      db
        .rows('vendor_invoice_items')
        .filter((i) => i.vendor_invoice_id === created.id),
    ).toHaveLength(2);
  });

  it.each([
    [{ due_date: '' }, 'due date'],
    [{ client_name: ' ' }, 'client name'],
    [{ items: [] }, 'at least one line item'],
    [
      { items: [{ description: '', quantity: 1, unit_price: 1 }] },
      'description',
    ],
  ])('rejects bad input %#', async (patch, message) => {
    const { service } = setup();
    await expect(
      service.createInvoice('u1', { ...base, ...patch }),
    ).rejects.toThrow(message);
  });
});
