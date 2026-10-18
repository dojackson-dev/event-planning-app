import { Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';

type Row = Record<string, unknown>;

function fakeAdmin(tables: Record<string, Row[]>) {
  return {
    from: (table: string) => {
      const filters: Array<[string, unknown]> = [];
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.limit = () => q;
      q.eq = (col: string, val: unknown) => {
        filters.push([col, val]);
        return q;
      };
      q.maybeSingle = () =>
        Promise.resolve({
          data:
            (tables[table] ?? []).find((r) =>
              filters.every(([c, v]) => r[c] === v),
            ) ?? null,
          error: null,
        });
      return q;
    },
  };
}

function setup(invoiceOwnerId: string, owner: Row) {
  const admin = fakeAdmin({
    invoices: [
      {
        id: 'inv-1',
        invoice_number: 'INV-1',
        amount_due: 100,
        total_amount: 100,
        status: 'sent',
        owner_id: invoiceOwnerId,
        client_email: 'c@example.test',
        public_token: 'tok',
      },
    ],
    owner_accounts: [owner],
    memberships: [],
  });
  const create = jest
    .fn()
    .mockResolvedValue({ id: 'cs_1', url: 'https://checkout.test/cs_1' });
  const service = Object.create(StripeService.prototype) as StripeService;
  Object.assign(service, {
    supabaseService: { getAdminClient: () => admin },
    stripe: { checkout: { sessions: { create } } },
    logger: new Logger('test'),
    frontendUrl: 'https://app.test',
  });
  return { service, create };
}

const owner = {
  id: 'acct-row-id',
  primary_owner_id: 'auth-user-id',
  stripe_connect_id: 'acct_owner',
  stripe_connect_status: 'active',
  subscription_status: 'active',
  plan_name: 'pro',
  enable_bnpl: true,
};

describe('owner public invoice routing', () => {
  it.each([
    ['the owner auth user id', 'auth-user-id'],
    ['the owner_accounts id', 'acct-row-id'],
  ])(
    'routes funds to the owner when invoices.owner_id is %s',
    async (_n, ref) => {
      const { service, create } = setup(ref, owner);
      await service.createPublicInvoiceCheckout('tok', 10000);
      const params = create.mock.calls[0][0];
      expect(params.payment_intent_data.transfer_data.destination).toBe(
        'acct_owner',
      );
      // pro plan: 1.5% of $100 plus the processing fee collected from the payer
      const processing = params.line_items[1].price_data.unit_amount;
      expect(params.payment_intent_data.application_fee_amount).toBe(
        150 + processing,
      );
    },
  );

  it('offers pay-later when the owner enabled it, however owner_id is stored', async () => {
    const { service, create } = setup('auth-user-id', owner);
    await service.createPublicInvoiceCheckout('tok', 10000, 'pay_later');
    expect(create.mock.calls[0][0].payment_method_types).toEqual([
      'afterpay_clearpay',
      'klarna',
      'affirm',
    ]);
  });

  it('does not route to an owner whose Stripe account is not active', async () => {
    const { service, create } = setup('auth-user-id', {
      ...owner,
      stripe_connect_status: 'pending',
    });
    await service.createPublicInvoiceCheckout('tok', 10000);
    expect(
      create.mock.calls[0][0].payment_intent_data.transfer_data,
    ).toBeUndefined();
  });
});
