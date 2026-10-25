import { ConfigService } from '@nestjs/config';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

type Row = Record<string, unknown>;

function setup(invoice: Row | null, otherPaid: Row[] = []) {
  const updates: Array<{
    table: string;
    values: Row;
    eq: Array<[string, unknown]>;
  }> = [];
  const database = {
    from: (table: string) => {
      const eq: Array<[string, unknown]> = [];
      let isUpdate = false;
      let isOtherInvoiceLookup = false;
      const query: Record<string, any> = {};
      query.select = jest.fn(() => query);
      query.eq = jest.fn((col: string, val: unknown) => {
        eq.push([col, val]);
        return query;
      });
      query.neq = jest.fn(() => {
        isOtherInvoiceLookup = true;
        return query;
      });
      query.limit = jest.fn(() => query);
      query.update = jest.fn((values: Row) => {
        isUpdate = true;
        updates.push({ table, values, eq });
        return query;
      });
      query.maybeSingle = jest.fn(async () => ({ data: invoice, error: null }));
      query.then = (resolve: (v: unknown) => unknown) => {
        let data: unknown = null;
        if (isUpdate && table === 'vendor_invoices')
          data = invoice ? [{ id: invoice.id }] : [];
        else if (isOtherInvoiceLookup) data = otherPaid;
        return Promise.resolve({ data, error: null }).then(resolve);
      };
      return query;
    },
  };
  const service = new VendorInvoicesService(
    { getAdminClient: () => database } as unknown as SupabaseService,
    {
      get: (k: string, f?: string) =>
        k === 'STRIPE_SECRET_KEY' ? 'sk_test_x' : f,
    } as unknown as ConfigService,
    {} as unknown as SmsNotificationsService,
  );
  return { service, updates };
}

const paid = (over: Row = {}): Row => ({
  id: 'inv-1',
  status: 'paid',
  notes: null,
  deposit_amount: null,
  vendor_booking_id: 'book-1',
  ...over,
});

describe('vendor invoice refunds', () => {
  it('cancels a fully refunded invoice, keeps a note and reopens the booking', async () => {
    const { service, updates } = setup(paid());
    await expect(
      service.markInvoiceRefundedByPaymentIntent('pi_1', 45363, true),
    ).resolves.toBe(true);
    const invoice = updates.find((u) => u.table === 'vendor_invoices')!;
    expect(invoice.values).toMatchObject({
      status: 'cancelled',
      amount_paid: 0,
      amount_due: 0,
      paid_at: null,
    });
    expect(String(invoice.values.notes)).toMatch(
      /^Refunded \$453\.63 via Stripe on \d{4}-\d{2}-\d{2}; invoice cancelled\.$/,
    );
    expect(invoice.eq).toContainEqual(['status', 'paid']);
    const booking = updates.find((u) => u.table === 'vendor_bookings')!;
    expect(booking.values).toMatchObject({ status: 'confirmed' });
    expect(booking.eq).toContainEqual(['status', 'paid']);
  });

  it('leaves the booking paid when another invoice for it is paid (the duplicate-payment case)', async () => {
    const { service, updates } = setup(paid(), [{ id: 'inv-2' }]);
    await service.markInvoiceRefundedByPaymentIntent('pi_1', 45363, true);
    expect(
      updates.some(
        (u) => u.table === 'vendor_invoices' && u.values.status === 'cancelled',
      ),
    ).toBe(true);
    expect(updates.some((u) => u.table === 'vendor_bookings')).toBe(false);
  });

  it('only notes a partial refund', async () => {
    const { service, updates } = setup(paid());
    await service.markInvoiceRefundedByPaymentIntent('pi_1', 5000, false);
    expect(updates).toHaveLength(1);
    expect(updates[0].values.status).toBeUndefined();
    expect(String(updates[0].values.notes)).toContain('Stripe refunded $50.00');
  });

  it('only notes a refund on an invoice with a deposit schedule', async () => {
    const { service, updates } = setup(paid({ deposit_amount: 100 }));
    await service.markInvoiceRefundedByPaymentIntent('pi_1', 45363, true);
    expect(updates).toHaveLength(1);
    expect(updates[0].values.status).toBeUndefined();
  });

  it('does nothing twice: an already cancelled invoice is left alone', async () => {
    const { service, updates } = setup(paid({ status: 'cancelled' }));
    await expect(
      service.markInvoiceRefundedByPaymentIntent('pi_1', 45363, true),
    ).resolves.toBe(true);
    expect(updates).toHaveLength(0);
  });

  it('does not repeat a note on a webhook retry', async () => {
    const day = new Date().toISOString().slice(0, 10);
    const { service, updates } = setup(
      paid({ notes: `Stripe refunded $50.00 on ${day}. Review this invoice.` }),
    );
    await service.markInvoiceRefundedByPaymentIntent('pi_1', 5000, false);
    expect(updates).toHaveLength(0);
  });

  it('reports false when no invoice belongs to the payment', async () => {
    const { service, updates } = setup(null);
    await expect(
      service.markInvoiceRefundedByPaymentIntent('pi_x', 100, true),
    ).resolves.toBe(false);
    expect(updates).toHaveLength(0);
  });
});
