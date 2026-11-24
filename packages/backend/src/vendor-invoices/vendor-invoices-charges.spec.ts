import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { FakeDb } from './test-support/fake-db';

function setup(invoice: Record<string, unknown> = {}) {
  const db = new FakeDb({
    vendor_accounts: [{ id: 'v1', user_id: 'u1', business_name: 'Savour' }],
    vendor_invoices: [
      {
        id: 'inv1',
        vendor_account_id: 'v1',
        invoice_number: 'VINV-2026-00001',
        public_token: 'tok1',
        status: 'paid',
        client_name: 'Ann',
        client_phone: '+16015550100',
        due_date: '2030-01-31',
        tax_rate: 0,
        discount_amount: 0,
        subtotal: 100,
        tax_amount: 0,
        total_amount: 100,
        amount_paid: 100,
        amount_due: 0,
        paid_at: '2030-01-01T00:00:00Z',
        deposit_amount: null,
        stripe_checkout_session_id: 'cs_done',
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
          .mockResolvedValue({ status: 'open', payment_status: 'unpaid' }),
        expire: jest.fn().mockResolvedValue({}),
      },
    },
  };
  const sms = { sendOne: jest.fn().mockResolvedValue(true) };
  const service = new VendorInvoicesService(
    { getAdminClient: () => db } as unknown as SupabaseService,
    {
      get: (key: string, fallback?: string) =>
        key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
    } as unknown as ConfigService,
    sms as unknown as SmsNotificationsService,
  );
  (service as any).stripe = stripe;
  return { db, service, stripe, sms };
}

const invoiceRow = (db: FakeDb) => db.rows('vendor_invoices')[0];
const delivery = { description: 'Delivery', quantity: 1, unit_price: 25 };

describe('adding additional charges to an invoice', () => {
  it('reopens a paid invoice with the new charge as the balance and keeps the payment credited', async () => {
    const { db, service, stripe, sms } = setup();
    await service.addAdditionalCharges('u1', 'inv1', { charges: [delivery] });

    expect(invoiceRow(db)).toMatchObject({
      status: 'sent',
      paid_at: null,
      subtotal: 125,
      total_amount: 125,
      amount_paid: 100,
      amount_due: 25,
    });
    expect(db.rows('vendor_invoice_items')).toHaveLength(2);
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
    expect(sms.sendOne).toHaveBeenCalledWith(
      '+16015550100',
      expect.stringContaining('Balance due: $25.00'),
    );
  });

  it('charges tax on the new charge and only asks for the unpaid part', async () => {
    const { db, service } = setup({
      tax_rate: 10,
      tax_amount: 10,
      total_amount: 110,
      amount_paid: 110,
    });
    await service.addAdditionalCharges('u1', 'inv1', {
      charges: [{ description: 'Overtime', unit_price: 50 }],
    });
    expect(invoiceRow(db)).toMatchObject({
      total_amount: 165,
      amount_paid: 110,
      amount_due: 55,
    });
  });

  it('keeps a manual part-payment credited and expires the page the client had open', async () => {
    const { db, service, stripe } = setup({
      status: 'sent',
      amount_paid: 40,
      amount_due: 60,
      paid_at: null,
      stripe_checkout_session_id: 'cs_open',
    });
    await service.addAdditionalCharges('u1', 'inv1', {
      charges: [delivery],
      notify_client: false,
    });
    expect(invoiceRow(db)).toMatchObject({
      total_amount: 125,
      amount_paid: 40,
      amount_due: 85,
    });
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith('cs_open');
  });

  it('does not text the client when told not to', async () => {
    const { service, sms } = setup();
    await service.addAdditionalCharges('u1', 'inv1', {
      charges: [delivery],
      notify_client: false,
    });
    expect(sms.sendOne).not.toHaveBeenCalled();
  });

  it('does not notify the client of a draft', async () => {
    const { service, sms } = setup({
      status: 'draft',
      amount_paid: 0,
      amount_due: 100,
      stripe_checkout_session_id: null,
    });
    await service.addAdditionalCharges('u1', 'inv1', { charges: [delivery] });
    expect(sms.sendOne).not.toHaveBeenCalled();
  });

  it.each(['processing', 'cancelled'])(
    'refuses a %s invoice',
    async (status) => {
      const { db, service } = setup({ status });
      await expect(
        service.addAdditionalCharges('u1', 'inv1', { charges: [delivery] }),
      ).rejects.toThrow(BadRequestException);
      expect(db.rows('vendor_invoice_items')).toHaveLength(1);
    },
  );

  it.each([
    ['no charges', []],
    ['a blank description', [{ description: ' ', unit_price: 5 }]],
    ['a zero amount', [{ description: 'Fee', unit_price: 0 }]],
    ['a negative amount', [{ description: 'Fee', unit_price: -5 }]],
    ['a zero quantity', [{ description: 'Fee', quantity: 0, unit_price: 5 }]],
    [
      'too many charges',
      Array.from({ length: 11 }, () => ({ description: 'Fee', unit_price: 1 })),
    ],
  ])('rejects %s', async (_label, charges) => {
    const { db, service } = setup();
    await expect(
      service.addAdditionalCharges('u1', 'inv1', { charges } as any),
    ).rejects.toThrow(BadRequestException);
    expect(db.rows('vendor_invoice_items')).toHaveLength(1);
    expect(invoiceRow(db).status).toBe('paid');
  });

  it("will not add to another vendor's invoice", async () => {
    const { service } = setup({ vendor_account_id: 'someone-else' });
    await expect(
      service.addAdditionalCharges('u1', 'inv1', { charges: [delivery] }),
    ).rejects.toThrow('Invoice not found');
  });
});
