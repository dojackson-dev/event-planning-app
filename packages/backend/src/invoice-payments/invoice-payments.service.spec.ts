import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoicePaymentsService } from './invoice-payments.service';
import { syncEventAfterPayment } from '../payments/event-payment-sync';

jest.mock('../payments/event-payment-sync', () => ({
  syncEventAfterPayment: jest.fn().mockResolvedValue(undefined),
}));

type Row = Record<string, any>;

/** Just enough of the Supabase query builder for these tests, backed by plain arrays. */
function fakeDatabase(tables: Record<string, Row[]>) {
  let nextId = 1;
  const hooks: { beforeInvoiceUpdate?: () => void } = {};
  const from = (table: string) => {
    const rows = (tables[table] ??= []);
    const filters: Array<(row: Row) => boolean> = [];
    let action: 'select' | 'insert' | 'update' | 'delete' = 'select';
    let payload: Row = {};
    let returning = false;

    const matching = () => rows.filter((row) => filters.every((f) => f(row)));
    const run = () => {
      if (action === 'insert') {
        const row = {
          id: `id-${nextId++}`,
          created_at: new Date().toISOString(),
          voided_at: null,
          ...payload,
        };
        rows.push(row);
        return [row];
      }
      if (action === 'update') {
        if (table !== 'invoice_payments') hooks.beforeInvoiceUpdate?.();
        const hit = matching();
        hit.forEach((row) => Object.assign(row, payload));
        return hit;
      }
      if (action === 'delete') {
        const hit = matching();
        hit.forEach((row) => rows.splice(rows.indexOf(row), 1));
        return hit;
      }
      return matching();
    };

    const query: any = {
      select: () => {
        returning = true;
        return query;
      },
      insert: (row: Row) => {
        action = 'insert';
        payload = row;
        return query;
      },
      update: (values: Row) => {
        action = 'update';
        payload = values;
        return query;
      },
      delete: () => {
        action = 'delete';
        return query;
      },
      eq: (col: string, value: unknown) => {
        filters.push((row) => row[col] === value);
        return query;
      },
      neq: (col: string, value: unknown) => {
        filters.push((row) => row[col] !== value);
        return query;
      },
      is: (col: string, value: unknown) => {
        filters.push((row) => (row[col] ?? null) === value);
        return query;
      },
      order: () => query,
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      single: async () => {
        const row = run()[0];
        return row
          ? { data: row, error: null }
          : { data: null, error: { message: 'none' } };
      },
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: run(), error: null }).then(resolve),
    };
    void returning;
    return query;
  };
  return { from, hooks };
}

function setup(over: { invoice?: Row; vendorInvoice?: Row } = {}) {
  const tables: Record<string, Row[]> = {
    invoices: [
      {
        id: 'inv-1',
        owner_id: 'owner-1',
        invoice_number: 'INV-2026-00001',
        status: 'sent',
        total_amount: 800,
        amount_paid: 0,
        amount_due: 800,
        event_id: 'ev-1',
        client_name: 'Dee',
        client_email: 'dee@example.test',
        client_phone: '+15555550100',
        ...over.invoice,
      },
    ],
    vendor_invoices: [
      {
        id: 'vinv-1',
        vendor_account_id: 'va-1',
        invoice_number: 'VINV-1',
        status: 'sent',
        total_amount: 500,
        amount_paid: 0,
        amount_due: 500,
        vendor_booking_id: 'vb-1',
        stripe_checkout_session_id: null,
        ...over.vendorInvoice,
      },
    ],
    vendor_accounts: [{ id: 'va-1', user_id: 'vendor-user' }],
    vendor_bookings: [{ id: 'vb-1', status: 'confirmed' }],
    invoice_payments: [],
  };
  const database = fakeDatabase(tables);
  const sms = { paymentReceived: jest.fn().mockResolvedValue(undefined) };
  const mail = {
    sendManualPaymentReceipt: jest.fn().mockResolvedValue(undefined),
  };
  const access = { resolveUserId: jest.fn(async (id: string) => id) };
  const service = new InvoicePaymentsService(
    { getAdminClient: () => database } as any,
    { get: () => undefined } as unknown as ConfigService,
    sms as any,
    mail as any,
    access as any,
  );
  return { service, tables, database, sms, mail };
}

const today = new Date().toISOString().slice(0, 10);
const pay = (over: Record<string, unknown> = {}) => ({
  amount: '300',
  method: 'check',
  paidOn: today,
  ...over,
});

describe('InvoicePaymentsService.record', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records a partial payment, marks the invoice partial and syncs the event', async () => {
    const { service, tables } = setup();
    const result = await service.record(
      'owner',
      'inv-1',
      'owner-1',
      pay({ reference: 'Check 1042' }),
    );

    expect(result.invoice).toEqual({
      status: 'partial',
      amount_paid: 300,
      amount_due: 500,
    });
    expect(tables.invoices[0]).toMatchObject({
      status: 'partial',
      amount_paid: 300,
      amount_due: 500,
    });
    expect(tables.invoice_payments).toHaveLength(1);
    expect(tables.invoice_payments[0]).toMatchObject({
      invoice_type: 'owner',
      invoice_id: 'inv-1',
      amount: 300,
      method: 'check',
      reference: 'Check 1042',
      recorded_by: 'owner-1',
    });
    expect(syncEventAfterPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'ev-1',
      300,
      false,
    );
  });

  it('marks the invoice paid and stamps the paid date when the balance is covered', async () => {
    const { service, tables } = setup({
      invoice: { amount_paid: 500, amount_due: 300 },
    });
    const result = await service.record('owner', 'inv-1', 'owner-1', pay());
    expect(result.invoice.status).toBe('paid');
    expect(tables.invoices[0].paid_date).toEqual(expect.any(String));
    expect(syncEventAfterPayment).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      'ev-1',
      800,
      true,
    );
  });

  it('marks a vendor booking paid only once the vendor invoice is fully paid', async () => {
    const first = setup();
    await first.service.record(
      'vendor',
      'vinv-1',
      'vendor-user',
      pay({ amount: '200' }),
    );
    expect(first.tables.vendor_invoices[0].status).toBe('sent');
    expect(first.tables.vendor_bookings[0].status).toBe('confirmed');

    const full = setup();
    await full.service.record(
      'vendor',
      'vinv-1',
      'vendor-user',
      pay({ amount: '500' }),
    );
    expect(full.tables.vendor_invoices[0]).toMatchObject({
      status: 'paid',
      amount_due: 0,
    });
    expect(full.tables.vendor_bookings[0].status).toBe('paid');
  });

  it("treats someone else's invoice as not found and changes nothing", async () => {
    const { service, tables } = setup();
    await expect(
      service.record('owner', 'inv-1', 'someone-else', pay()),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.record('vendor', 'vinv-1', 'someone-else', pay()),
    ).rejects.toThrow(NotFoundException);
    expect(tables.invoice_payments).toHaveLength(0);
    expect(tables.invoices[0].amount_paid).toBe(0);
  });

  it('rejects bad input without saving anything', async () => {
    const { service, tables } = setup();
    const bad: Array<Record<string, unknown>> = [
      pay({ amount: '0' }),
      pay({ amount: '-5' }),
      pay({ amount: '900' }),
      pay({ method: 'bitcoin' }),
      pay({ paidOn: '2099-01-01' }),
      pay({ paidOn: 'yesterday' }),
      pay({ paidOn: '2026-02-31' }),
    ];
    for (const input of bad) {
      await expect(
        service.record('owner', 'inv-1', 'owner-1', input),
      ).rejects.toThrow(BadRequestException);
    }
    await expect(
      service.record('bookings', 'inv-1', 'owner-1', pay()),
    ).rejects.toThrow(NotFoundException);
    expect(tables.invoice_payments).toHaveLength(0);
  });

  it('removes the saved payment and reports a conflict when the invoice changed in the meantime', async () => {
    const { service, tables, database } = setup();
    database.hooks.beforeInvoiceUpdate = () => {
      tables.invoices[0].amount_paid = 100; // an online payment landed first
    };
    await expect(
      service.record('owner', 'inv-1', 'owner-1', pay()),
    ).rejects.toThrow(ConflictException);
    expect(tables.invoice_payments).toHaveLength(0);
    expect(tables.invoices[0].amount_paid).toBe(100);
  });

  it('sends a receipt only when asked', async () => {
    const quiet = setup();
    await quiet.service.record('owner', 'inv-1', 'owner-1', pay());
    expect(quiet.sms.paymentReceived).not.toHaveBeenCalled();
    expect(quiet.mail.sendManualPaymentReceipt).not.toHaveBeenCalled();

    const loud = setup();
    await loud.service.record(
      'owner',
      'inv-1',
      'owner-1',
      pay({ sendReceipt: true }),
    );
    expect(loud.sms.paymentReceived).toHaveBeenCalledWith(
      '+15555550100',
      'Dee',
      300,
      'invoice INV-2026-00001',
    );
    expect(loud.mail.sendManualPaymentReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        toEmail: 'dee@example.test',
        amount: 300,
        methodLabel: 'Check',
        balanceDue: 500,
      }),
    );
  });
});

describe('InvoicePaymentsService.voidPayment', () => {
  beforeEach(() => jest.clearAllMocks());

  async function withPayment() {
    const ctx = setup();
    const { payment } = await ctx.service.record(
      'owner',
      'inv-1',
      'owner-1',
      pay({ amount: '800' }),
    );
    return { ...ctx, paymentId: payment.id as string };
  }

  it('reopens the invoice, keeps the payment on record, and flags linked statuses for review', async () => {
    const { service, tables, paymentId } = await withPayment();
    const result = await service.voidPayment(
      paymentId,
      'owner-1',
      'Check bounced',
    );
    expect(result.invoice).toEqual({
      status: 'sent',
      amount_paid: 0,
      amount_due: 800,
    });
    expect(result.reviewLinkedStatus).toBe(true);
    expect(tables.invoices[0]).toMatchObject({
      status: 'sent',
      amount_paid: 0,
      paid_date: null,
    });
    expect(tables.invoice_payments[0]).toMatchObject({
      void_reason: 'Check bounced',
      voided_by: 'owner-1',
    });
    expect(tables.invoice_payments[0].voided_at).toEqual(expect.any(String));
  });

  it('needs a reason, refuses a second void, and hides other users payments', async () => {
    const { service, paymentId, tables } = await withPayment();
    await expect(
      service.voidPayment(paymentId, 'owner-1', '  '),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.voidPayment(paymentId, 'someone-else', 'x'),
    ).rejects.toThrow(NotFoundException);
    expect(tables.invoice_payments[0].voided_at).toBeNull();

    await service.voidPayment(paymentId, 'owner-1', 'Duplicate');
    await expect(
      service.voidPayment(paymentId, 'owner-1', 'Again'),
    ).rejects.toThrow(ConflictException);
  });

  it('puts the payment back if the invoice changed while voiding', async () => {
    const { service, tables, database, paymentId } = await withPayment();
    database.hooks.beforeInvoiceUpdate = () => {
      tables.invoices[0].amount_paid = 750;
    };
    await expect(
      service.voidPayment(paymentId, 'owner-1', 'Mistake'),
    ).rejects.toThrow(ConflictException);
    expect(tables.invoice_payments[0].voided_at).toBeNull();
  });

  it('does not reopen a cancelled invoice', async () => {
    const { service, tables, paymentId } = await withPayment();
    tables.invoices[0].status = 'cancelled';
    const result = await service.voidPayment(
      paymentId,
      'owner-1',
      'Refunded in cash',
    );
    expect(result.invoice.status).toBe('cancelled');
    expect(tables.invoices[0].amount_paid).toBe(0);
  });
});

describe('InvoicePaymentsService.list', () => {
  it('lists payments only for an invoice the user owns', async () => {
    const { service } = setup();
    await service.record('owner', 'inv-1', 'owner-1', pay());
    await expect(
      service.list('owner', 'inv-1', 'owner-1'),
    ).resolves.toHaveLength(1);
    await expect(
      service.list('owner', 'inv-1', 'someone-else'),
    ).rejects.toThrow(NotFoundException);
  });
});
