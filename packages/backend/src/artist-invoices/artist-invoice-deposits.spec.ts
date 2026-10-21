import { ArtistInvoicesService } from './artist-invoices.service';

type Rows = Record<string, any[]>;

/** Minimal in-memory stand-in for the Supabase query builder. */
function fakeSupabase(rows: Rows) {
  const from = (table: string) => {
    const filters: Array<[string, unknown]> = [];
    let op: 'select' | 'update' = 'select';
    let patch: any = {};
    const exec = () => {
      const matched = (rows[table] ?? []).filter((row) =>
        filters.every(([key, value]) => row[key] === value),
      );
      if (op === 'update') {
        matched.forEach((row) => Object.assign(row, patch));
        return { data: matched.map((row) => ({ id: row.id })), error: null };
      }
      return { data: matched.map((row) => ({ ...row })), error: null };
    };
    const chain: any = {
      select: () => chain,
      eq: (key: string, value: unknown) => {
        filters.push([key, value]);
        return chain;
      },
      update: (value: any) => {
        op = 'update';
        patch = value;
        return chain;
      },
      single: () =>
        Promise.resolve({ data: exec().data[0] ?? null, error: null }),
      maybeSingle: () =>
        Promise.resolve({ data: exec().data[0] ?? null, error: null }),
      then: (resolve: any) => resolve(exec()),
    };
    return chain;
  };
  return { getAdminClient: () => ({ from }) };
}

function setup(invoice: any) {
  const rows: Rows = { artist_invoices: [invoice], artist_bookings: [] };
  const sms = {
    vendorInvoicePaid: jest.fn().mockResolvedValue(undefined),
    paymentReceived: jest.fn().mockResolvedValue(undefined),
  };
  const config = {
    get: (key: string, fallback?: string) =>
      key === 'STRIPE_SECRET_KEY' ? 'sk_test_123' : fallback,
  };
  const service = new ArtistInvoicesService(
    fakeSupabase(rows) as any,
    config as any,
    sms as any,
  );
  const create = jest
    .fn()
    .mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test/pay' });
  (service as any).stripe = { checkout: { sessions: { create } } };
  return { service, rows, create, sms };
}

const baseInvoice = {
  id: 'inv-1',
  invoice_number: 'AINV-1',
  public_token: 'tok',
  status: 'sent',
  client_name: 'Casey',
  client_email: 'casey@example.com',
  client_phone: null,
  subtotal: 1000,
  tax_amount: 0,
  discount_amount: 0,
  total_amount: 1000,
  amount_paid: 0,
  amount_due: 1000,
  stripe_checkout_session_id: null,
  artist_accounts: {
    stripe_account_id: 'acct_1',
    stripe_connect_status: 'active',
    artist_name: 'DJ Nova',
    booking_phone: null,
    enable_bnpl: false,
  },
};

describe('artist invoice deposits', () => {
  it('charges only the deposit and records it as the pending credit', async () => {
    const { service, rows, create } = setup({
      ...baseInvoice,
      deposit_amount: 300,
      pending_credit_cents: null,
    });

    await service.createCheckoutSession('tok', 'card', 'deposit');

    const lineItem = create.mock.calls[0][0].line_items[0];
    expect(lineItem.price_data.unit_amount).toBe(30000);
    expect(lineItem.price_data.product_data.name).toContain('Deposit');
    expect(rows.artist_invoices[0].pending_credit_cents).toBe(30000);
    expect(rows.artist_invoices[0].stripe_checkout_session_id).toBe('cs_1');
  });

  it('still charges the full amount when the full amount is chosen', async () => {
    const { service, create } = setup({
      ...baseInvoice,
      deposit_amount: 300,
      pending_credit_cents: null,
    });
    await service.createCheckoutSession('tok', 'card', 'full');
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(
      100000,
    );
  });

  it('leaves invoices without a deposit untouched by the new columns', async () => {
    const { service, rows, create } = setup({ ...baseInvoice });
    await service.createCheckoutSession('tok', 'card', 'deposit');
    expect(create.mock.calls[0][0].line_items[0].price_data.unit_amount).toBe(
      100000,
    );
    expect(rows.artist_invoices[0]).not.toHaveProperty('pending_credit_cents');
  });

  it('credits a deposit once, then the balance, and ignores duplicate webhooks', async () => {
    const { service, rows } = setup({
      ...baseInvoice,
      stripe_checkout_session_id: 'cs_dep',
      deposit_amount: 300,
      pending_credit_cents: 30000,
    });

    await service.markInvoicePaidBySession('cs_dep', 'pi_dep');
    expect(rows.artist_invoices[0]).toMatchObject({
      status: 'sent',
      amount_paid: 300,
      amount_due: 700,
      pending_credit_cents: null,
    });

    // The same payment arriving again (webhook + verify + payment_intent) changes nothing.
    await service.markInvoicePaidBySession('cs_dep', 'pi_dep');
    await service.markInvoicePaidByPaymentIntent('pi_dep');
    expect(rows.artist_invoices[0]).toMatchObject({
      amount_paid: 300,
      amount_due: 700,
    });

    // A later balance checkout credits the rest and closes the invoice.
    Object.assign(rows.artist_invoices[0], {
      stripe_checkout_session_id: 'cs_bal',
      pending_credit_cents: 70000,
    });
    await service.markInvoicePaidBySession('cs_bal', 'pi_bal');
    expect(rows.artist_invoices[0]).toMatchObject({
      status: 'paid',
      amount_paid: 1000,
      amount_due: 0,
    });
  });

  it('still marks a no-deposit invoice paid in full', async () => {
    const { service, rows } = setup({
      ...baseInvoice,
      stripe_checkout_session_id: 'cs_full',
    });
    await service.markInvoicePaidBySession('cs_full', 'pi_full');
    expect(rows.artist_invoices[0]).toMatchObject({
      status: 'paid',
      amount_paid: 1000,
      amount_due: 0,
    });
  });
});
