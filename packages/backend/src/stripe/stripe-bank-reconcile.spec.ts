import { Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';

function invoiceService() {
  return {
    markInvoicePaidByPaymentIntent: jest.fn().mockResolvedValue(undefined),
    revertProcessingStatus: jest.fn().mockResolvedValue(undefined),
  };
}

function setup(
  stuck: Record<string, Array<Record<string, unknown>>>,
  intents: Record<string, { status: string }>,
) {
  const vendor = invoiceService();
  const artist = invoiceService();
  const promoter = invoiceService();
  const lt = jest.fn();
  const database = {
    from: (table: string) => {
      const query: Record<string, jest.Mock> = {};
      query.select = jest.fn(() => query);
      query.eq = jest.fn(() => query);
      query.lt = lt.mockImplementation(() =>
        Promise.resolve({ data: stuck[table] ?? [], error: null }),
      );
      return query;
    },
  };
  const retrieve = jest.fn((id: string) =>
    intents[id]
      ? Promise.resolve(intents[id])
      : Promise.reject(new Error('missing')),
  );
  const service = Object.create(StripeService.prototype) as StripeService;
  Object.assign(service, {
    supabaseService: { getAdminClient: () => database },
    vendorInvoicesService: vendor,
    artistInvoicesService: artist,
    promoterInvoicesService: promoter,
    stripe: { paymentIntents: { retrieve } },
    logger: new Logger('test'),
  });
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  return { service, vendor, artist, promoter };
}

describe('reconcileStuckBankPayments', () => {
  afterEach(() => jest.restoreAllMocks());

  it('records a payment Stripe says succeeded, and reopens one that failed', async () => {
    const { service, vendor, artist } = setup(
      {
        vendor_invoices: [
          {
            id: '1',
            invoice_number: 'BINV-1',
            stripe_payment_intent_id: 'pi_ok',
          },
        ],
        artist_invoices: [
          {
            id: '2',
            invoice_number: 'AINV-1',
            stripe_payment_intent_id: 'pi_failed',
          },
        ],
      },
      {
        pi_ok: { status: 'succeeded' },
        pi_failed: { status: 'requires_payment_method' },
      },
    );
    await expect(service.reconcileStuckBankPayments()).resolves.toEqual({
      checked: 2,
      paid: 1,
      reverted: 1,
    });
    expect(vendor.markInvoicePaidByPaymentIntent).toHaveBeenCalledWith('pi_ok');
    expect(artist.revertProcessingStatus).toHaveBeenCalledWith('pi_failed');
  });

  it('leaves a bank payment that is still clearing alone', async () => {
    const { service, vendor } = setup(
      {
        vendor_invoices: [
          {
            id: '1',
            invoice_number: 'BINV-1',
            stripe_payment_intent_id: 'pi_wait',
          },
        ],
      },
      { pi_wait: { status: 'processing' } },
    );
    await expect(service.reconcileStuckBankPayments()).resolves.toEqual({
      checked: 1,
      paid: 0,
      reverted: 0,
    });
    expect(vendor.markInvoicePaidByPaymentIntent).not.toHaveBeenCalled();
    expect(vendor.revertProcessingStatus).not.toHaveBeenCalled();
  });

  it('keeps going when Stripe cannot find one payment or an invoice has none on file', async () => {
    const { service, promoter } = setup(
      {
        vendor_invoices: [
          { id: '1', invoice_number: 'BINV-1', stripe_payment_intent_id: null },
          {
            id: '2',
            invoice_number: 'BINV-2',
            stripe_payment_intent_id: 'pi_gone',
          },
        ],
        promoter_invoices: [
          {
            id: '3',
            invoice_number: 'PINV-1',
            stripe_payment_intent_id: 'pi_ok',
          },
        ],
      },
      { pi_ok: { status: 'succeeded' } },
    );
    await expect(service.reconcileStuckBankPayments()).resolves.toEqual({
      checked: 3,
      paid: 1,
      reverted: 0,
    });
    expect(promoter.markInvoicePaidByPaymentIntent).toHaveBeenCalledWith(
      'pi_ok',
    );
  });
});
