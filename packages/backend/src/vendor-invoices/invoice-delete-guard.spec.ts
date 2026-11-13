import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VendorInvoicesService } from './vendor-invoices.service';
import { ArtistInvoicesService } from '../artist-invoices/artist-invoices.service';
import { PromoterInvoicesService } from '../promoter-invoices/promoter-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { assertNoPaymentOnInvoice } from '../common/invoice-delete-guard';
import { FakeDb } from './test-support/fake-db';

const config = {
  get: (key: string, fallback?: string) =>
    key === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : fallback,
} as unknown as ConfigService;
const sms = {} as unknown as SmsNotificationsService;

describe('assertNoPaymentOnInvoice', () => {
  it.each([
    [{ status: 'paid' }],
    [{ status: 'processing' }],
    [{ status: 'sent', amount_paid: 40 }],
    [{ status: 'sent', stripe_payment_intent_id: 'pi_1' }],
    [{ status: 'cancelled', stripe_payment_intent_id: 'pi_1' }],
  ])('refuses %j', (invoice) => {
    expect(() => assertNoPaymentOnInvoice(invoice)).toThrow(
      'has a payment on it',
    );
  });
  it.each([
    [{ status: 'draft' }],
    [{ status: 'sent', amount_paid: 0 }],
    [{ status: 'cancelled', amount_paid: '0' }],
  ])('allows %j', (invoice) => {
    expect(() => assertNoPaymentOnInvoice(invoice)).not.toThrow();
  });
});

describe('deleting a vendor invoice', () => {
  function setup(
    invoice: Record<string, unknown>,
    session?: Record<string, unknown>,
  ) {
    const db = new FakeDb({
      vendor_accounts: [
        { id: 'v1', user_id: 'u1' },
        { id: 'v2', user_id: 'u2' },
      ],
      vendor_invoices: [
        {
          id: 'i1',
          vendor_account_id: 'v1',
          status: 'sent',
          amount_paid: 0,
          ...invoice,
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
      config,
      sms,
    );
    (service as any).stripe = stripe;
    return { db, service, stripe };
  }

  it.each(['paid', 'processing'])('keeps a %s invoice', async (status) => {
    const { db, service } = setup({ status });
    await expect(service.deleteInvoice('u1', 'i1')).rejects.toThrow(
      'has a payment on it',
    );
    expect(db.rows('vendor_invoices')).toHaveLength(1);
  });

  it('keeps an invoice that has a Stripe payment recorded', async () => {
    const { db, service } = setup({ stripe_payment_intent_id: 'pi_3UUR2o' });
    await expect(service.deleteInvoice('u1', 'i1')).rejects.toThrow(
      BadRequestException,
    );
    expect(db.rows('vendor_invoices')).toHaveLength(1);
  });

  it('deletes an unpaid sent invoice and expires the payment page the client had open', async () => {
    const { db, service, stripe } = setup({
      stripe_checkout_session_id: 'cs_open',
    });
    await expect(service.deleteInvoice('u1', 'i1')).resolves.toEqual({
      success: true,
    });
    expect(stripe.checkout.sessions.expire).toHaveBeenCalledWith('cs_open');
    expect(db.rows('vendor_invoices')).toHaveLength(0);
  });

  it('keeps the invoice when the client has just paid on the open checkout', async () => {
    const { db, service } = setup(
      { stripe_checkout_session_id: 'cs_paid' },
      { status: 'complete', payment_status: 'paid' },
    );
    await expect(service.deleteInvoice('u1', 'i1')).rejects.toThrow(
      'payment was just received',
    );
    expect(db.rows('vendor_invoices')).toHaveLength(1);
  });

  it('deletes a draft without touching Stripe', async () => {
    const { db, service, stripe } = setup({ status: 'draft' });
    await service.deleteInvoice('u1', 'i1');
    expect(db.rows('vendor_invoices')).toHaveLength(0);
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it("will not delete another vendor's invoice", async () => {
    const { db, service } = setup({});
    await expect(service.deleteInvoice('u2', 'i1')).rejects.toThrow(
      'Invoice not found',
    );
    expect(db.rows('vendor_invoices')).toHaveLength(1);
  });
});

describe.each([
  [
    'artist',
    ArtistInvoicesService,
    'artist_invoices',
    'artist_accounts',
    'artist_account_id',
  ],
  [
    'promoter',
    PromoterInvoicesService,
    'promoter_invoices',
    'promoter_accounts',
    'promoter_account_id',
  ],
] as const)('deleting a %s invoice', (_name, Service, table, accounts, fk) => {
  function setup(invoice: Record<string, unknown>) {
    const db = new FakeDb({
      [accounts]: [{ id: 'a1', user_id: 'u1' }],
      [table]: [{ id: 'i1', [fk]: 'a1', status: 'sent', ...invoice }],
    });
    const service = new (Service as any)(
      { getAdminClient: () => db } as unknown as SupabaseService,
      config,
      sms,
    );
    return { db, service };
  }

  it('keeps a paid invoice and one with a Stripe payment', async () => {
    for (const invoice of [
      { status: 'paid' },
      { stripe_payment_intent_id: 'pi_1' },
    ]) {
      const { db, service } = setup(invoice);
      await expect(service.deleteInvoice('u1', 'i1')).rejects.toThrow(
        'has a payment on it',
      );
      expect(db.rows(table)).toHaveLength(1);
    }
  });

  it('still deletes an unpaid invoice', async () => {
    const { db, service } = setup({});
    await expect(service.deleteInvoice('u1', 'i1')).resolves.toEqual({
      success: true,
    });
    expect(db.rows(table)).toHaveLength(0);
  });
});
