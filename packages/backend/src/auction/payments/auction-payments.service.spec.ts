import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { computeOrderAmounts } from '../auction-money';
import { hashPayToken } from './auction-payments.helpers';
import { AuctionPaymentsService } from './auction-payments.service';
import { FakeDb } from './fake-db';

const FUTURE = new Date(Date.now() + 48 * 3600_000).toISOString();
const PAST = new Date(Date.now() - 3600_000).toISOString();

function baseOrder(over: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    auction_id: 'auction-1',
    promoter_account_id: 'promoter-1',
    bidder_id: 'bidder-1',
    kind: 'settlement',
    status: 'charging',
    buyer_name: 'Sam Winner',
    buyer_email: 'sam@example.com',
    buyer_phone: null,
    auction_title: 'Gala Auction',
    event_title: 'Gala',
    org_name: 'Helping Hands',
    org_ein: '123456789',
    subtotal_cents: 10_000,
    tax_cents: 0,
    processing_fee_cents: 0,
    platform_fee_cents: 0,
    total_cents: 0,
    application_fee_cents: 0,
    platform_fee_rate: 0.015,
    tax_calculation_id: null,
    tax_transaction_id: null,
    stripe_payment_intent_id: null,
    pay_by_at: FUTURE,
    charge_attempts: 1,
    last_payment_intent_id: null,
    stripe_checkout_session_id: null,
    pay_token_hash: null,
    pay_token_expires_at: null,
    ...over,
  };
}

const PROMOTER = {
  id: 'promoter-1',
  email: 'promoter@example.org',
  company_name: 'Helping Hands',
  is_nonprofit: true,
  nonprofit_status: 'verified',
  stripe_account_id: 'acct_123',
  stripe_connect_status: 'active',
};

const BIDDER = {
  id: 'bidder-1',
  auction_id: 'auction-1',
  display_name: 'Sam Winner',
  email: 'sam@example.com',
  phone_e164: '+15555550100',
  stripe_customer_id: 'cus_1',
  stripe_payment_method_id: 'pm_1',
  card_status: 'ready',
  blocked_at: null,
};

const ITEM = {
  id: 'oi-1',
  order_id: 'order-1',
  title: 'Signed guitar',
  quantity: 1,
  price_cents: 10_000,
  fair_market_value_cents: 6_000,
  tax_code: null,
};

interface Opts {
  taxEnabled?: boolean;
  order?: Record<string, unknown>;
  promoter?: Record<string, unknown> | null;
  bidder?: Record<string, unknown> | null;
  stripe?: Record<string, unknown>;
  paidReturns?: boolean;
}

function setup(opts: Opts = {}) {
  const db = new FakeDb();
  const state = { order: baseOrder(opts.order) };
  const promoter = opts.promoter === undefined ? PROMOTER : opts.promoter;
  const bidder = opts.bidder === undefined ? BIDDER : opts.bidder;
  db.on('promoter_accounts.select', () => ({ data: promoter }));
  db.on('auction_bidders.select', () => ({ data: bidder }));
  db.on('auction_orders.select', () => ({ data: state.order }));
  db.on('auction_order_items.select', { data: [ITEM] });
  db.on('auction_orders.update', () => ({ data: [state.order] }));
  db.on('auction_bidders.update', { data: [{ id: 'bidder-1' }] });
  db.onRpc('set_auction_order_amounts', { data: true });
  db.onRpc('mark_auction_order_paid', { data: opts.paidReturns ?? true });
  db.onRpc('mark_auction_order_failed', { data: 'failed' });

  const stripe = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_1',
        status: 'succeeded',
        amount_received: 0,
      }),
      search: jest.fn().mockResolvedValue({ data: [] }),
      retrieve: jest.fn(),
      cancel: jest.fn().mockResolvedValue({}),
    },
    paymentMethods: {
      retrieve: jest.fn().mockResolvedValue({
        type: 'card',
        card: { brand: 'visa', last4: '4242' },
        billing_details: { address: { country: 'US', postal_code: '60601' } },
      }),
      detach: jest.fn().mockResolvedValue({}),
    },
    tax: {
      calculations: {
        create: jest.fn().mockResolvedValue({
          id: 'taxcalc_1',
          tax_amount_exclusive: 825,
          tax_breakdown: [],
        }),
      },
      transactions: {
        createFromCalculation: jest.fn().mockResolvedValue({ id: 'tax_tr_1' }),
      },
    },
    customers: { create: jest.fn().mockResolvedValue({ id: 'cus_new' }) },
    setupIntents: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 'seti_1', client_secret: 'seti_1_secret' }),
      retrieve: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest
          .fn()
          .mockResolvedValue({ id: 'cs_1', url: 'https://stripe.test/cs_1' }),
        expire: jest.fn().mockResolvedValue({}),
      },
    },
    charges: { retrieve: jest.fn() },
    ...opts.stripe,
  };

  const config = {
    get: (key: string) =>
      ({
        STRIPE_SECRET_KEY: 'sk_test_dummy',
        FRONTEND_URL: 'https://app.test',
        STRIPE_TAX_ENABLED: opts.taxEnabled ? 'true' : 'false',
      })[key],
  };
  const mail = { sendPayLink: jest.fn().mockResolvedValue('sent') };
  const sms = { send: jest.fn().mockResolvedValue(true) };
  const service = new AuctionPaymentsService(
    { getAdminClient: () => db.client() } as never,
    config as never,
    mail as never,
    sms as never,
  );
  (service as unknown as { stripe: unknown }).stripe = stripe;
  return { service, db, stripe, mail, sms, state };
}

const cardError = (code: string, decline?: string) =>
  new Stripe.errors.StripeCardError({
    type: 'card_error',
    code,
    decline_code: decline,
    message: 'declined',
  } as never);

describe('AuctionPaymentsService.chargeClaimedOrder', () => {
  it('stores amounts, then charges exactly total with the application fee and destination', async () => {
    const { service, db, stripe } = setup();
    const expected = computeOrderAmounts({
      subtotalCents: 10_000,
      taxCents: 0,
      rate: 0.015,
    });
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount_received: expected.totalCents,
    });

    const outcome = await service.chargeClaimedOrder(baseOrder() as never);

    expect(outcome.status).toBe('paid');
    expect(db.rpcArgs('set_auction_order_amounts')[0]).toMatchObject({
      p_order_id: 'order-1',
      p_tax_cents: 0,
      p_total_cents: expected.totalCents,
      p_application_fee_cents: expected.applicationFeeCents,
      p_platform_fee_cents: expected.platformFeeCents,
      p_processing_fee_cents: expected.processingFeeCents,
    });
    const [params, options] = stripe.paymentIntents.create.mock.calls[0];
    expect(params).toMatchObject({
      amount: expected.totalCents,
      currency: 'usd',
      customer: 'cus_1',
      payment_method: 'pm_1',
      off_session: true,
      confirm: true,
      application_fee_amount: expected.applicationFeeCents,
      transfer_data: { destination: 'acct_123' },
      metadata: { auction_order_id: 'order-1', auction_id: 'auction-1' },
    });
    // The non-profit nets exactly the subtotal.
    expect(params.amount - params.application_fee_amount).toBe(10_000);
    expect(options).toEqual({ idempotencyKey: 'auction-order-order-1-a1' });
    expect(db.rpcArgs('mark_auction_order_paid')[0]).toEqual({
      p_order_id: 'order-1',
      p_payment_intent: 'pi_1',
      p_amount_received_cents: expected.totalCents,
      p_tax_transaction_id: null,
    });
  });

  it('keeps the idempotency key stable per attempt and changes it for a new attempt', async () => {
    const first = setup();
    await first.service.chargeClaimedOrder(baseOrder() as never);
    await first.service.chargeClaimedOrder(baseOrder() as never);
    const keys = first.stripe.paymentIntents.create.mock.calls.map(
      (c: unknown[]) => (c[1] as { idempotencyKey: string }).idempotencyKey,
    );
    expect(keys).toEqual([
      'auction-order-order-1-a1',
      'auction-order-order-1-a1',
    ]);

    const second = setup({ order: { charge_attempts: 2 } });
    await second.service.chargeClaimedOrder(
      baseOrder({ charge_attempts: 2 }) as never,
    );
    expect(second.stripe.paymentIntents.create.mock.calls[0][1]).toEqual({
      idempotencyKey: 'auction-order-order-1-a2',
    });
  });

  it('reuses stored amounts instead of recalculating', async () => {
    const amounts = computeOrderAmounts({
      subtotalCents: 10_000,
      taxCents: 0,
      rate: 0.015,
    });
    const stored = baseOrder({
      total_cents: amounts.totalCents,
      application_fee_cents: amounts.applicationFeeCents,
      platform_fee_cents: amounts.platformFeeCents,
      processing_fee_cents: amounts.processingFeeCents,
    });
    const { service, db, stripe } = setup({ order: stored });
    await service.chargeClaimedOrder(stored as never);
    expect(db.rpcArgs('set_auction_order_amounts')).toHaveLength(0);
    expect(stripe.paymentIntents.create.mock.calls[0][0].amount).toBe(
      amounts.totalCents,
    );
  });

  it('skips tax with an audit row when Stripe Tax is disabled', async () => {
    const { service, db, stripe } = setup({ taxEnabled: false });
    await service.chargeClaimedOrder(baseOrder() as never);
    expect(stripe.tax.calculations.create).not.toHaveBeenCalled();
    const audits = db.ops('auction_audit', 'insert').map((c) => c.payload);
    expect(audits).toContainEqual(
      expect.objectContaining({
        action: 'tax_skipped',
        details: { reason: 'stripe_tax_disabled' },
      }),
    );
  });

  it('adds Stripe Tax to the charge and records the tax transaction after payment', async () => {
    const { service, db, stripe, state } = setup({ taxEnabled: true });
    const expected = computeOrderAmounts({
      subtotalCents: 10_000,
      taxCents: 825,
      rate: 0.015,
    });
    stripe.paymentIntents.create.mockResolvedValue({
      id: 'pi_1',
      status: 'succeeded',
      amount_received: expected.totalCents,
    });
    // After amounts are stored the order row carries the calculation id.
    db.onRpc('set_auction_order_amounts', () => {
      state.order = {
        ...state.order,
        tax_calculation_id: 'taxcalc_1',
        total_cents: expected.totalCents,
      };
      return { data: true };
    });

    await service.chargeClaimedOrder(baseOrder() as never);

    const calcArgs = stripe.tax.calculations.create.mock.calls[0][0];
    expect(calcArgs).toMatchObject({
      currency: 'usd',
      line_items: [
        {
          amount: 10_000,
          reference: 'oi-1',
          tax_behavior: 'exclusive',
          tax_code: 'txcd_99999999',
        },
      ],
      customer_details: {
        address: { country: 'US', postal_code: '60601' },
        address_source: 'billing',
      },
    });
    expect(db.rpcArgs('set_auction_order_amounts')[0]).toMatchObject({
      p_tax_cents: 825,
      p_tax_calculation_id: 'taxcalc_1',
      p_total_cents: expected.totalCents,
      p_application_fee_cents: expected.applicationFeeCents,
    });
    expect(stripe.paymentIntents.create.mock.calls[0][0].amount).toBe(
      expected.totalCents,
    );
    expect(stripe.tax.transactions.createFromCalculation).toHaveBeenCalledWith(
      { calculation: 'taxcalc_1', reference: 'order-1' },
      { idempotencyKey: 'auction-tax-order-1' },
    );
    expect(db.rpcArgs('mark_auction_order_paid')[0]).toMatchObject({
      p_tax_transaction_id: 'tax_tr_1',
    });
  });

  it('skips tax (audited) when the saved card has no billing address', async () => {
    const { service, db, stripe } = setup({ taxEnabled: true });
    stripe.paymentMethods.retrieve.mockResolvedValue({
      type: 'card',
      billing_details: { address: {} },
    });
    await service.chargeClaimedOrder(baseOrder() as never);
    expect(stripe.tax.calculations.create).not.toHaveBeenCalled();
    expect(
      db.ops('auction_audit', 'insert').map((c) => c.payload),
    ).toContainEqual(
      expect.objectContaining({ details: { reason: 'no_billing_address' } }),
    );
    expect(stripe.paymentIntents.create).toHaveBeenCalled();
  });

  it('does not charge when the tax calculation fails; the order is failed with a retry', async () => {
    const { service, db, stripe } = setup({ taxEnabled: true });
    stripe.tax.calculations.create.mockRejectedValue(new Error('tax api down'));

    const outcome = await service.chargeClaimedOrder(baseOrder() as never);

    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(db.rpcArgs('set_auction_order_amounts')).toHaveLength(0);
    expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
      p_error_code: 'tax_calculation_failed',
      p_requires_action: false,
      p_retry_after_seconds: 21_600,
    });
    expect(outcome.status).toBe('failed');
  });

  it('puts the order on hold when the promoter is no longer eligible', async () => {
    const { service, db, stripe } = setup({
      promoter: { ...PROMOTER, stripe_connect_status: 'pending' },
    });
    await service.chargeClaimedOrder(baseOrder() as never);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
      p_error_code: 'connect_unavailable',
      p_requires_action: false,
    });
  });

  it('refuses an unverified non-profit', async () => {
    const { service, db, stripe } = setup({
      promoter: { ...PROMOTER, nonprofit_status: 'pending' },
    });
    await service.chargeClaimedOrder(baseOrder() as never);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
      p_error_code: 'connect_unavailable',
    });
  });

  it('sends a bidder without a ready card to the pay link', async () => {
    const { service, db, stripe } = setup({
      bidder: {
        ...BIDDER,
        card_status: 'none',
        stripe_payment_method_id: null,
      },
    });
    await service.chargeClaimedOrder(baseOrder() as never);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
      p_error_code: 'no_card_on_file',
      p_requires_action: true,
    });
  });

  it('defaults an order whose pay-by time has passed without charging', async () => {
    const { service, db, stripe } = setup();
    await service.chargeClaimedOrder(baseOrder({ pay_by_at: PAST }) as never);
    expect(stripe.paymentIntents.create).not.toHaveBeenCalled();
    expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
      p_error_code: 'grace_expired',
    });
  });

  describe('error mapping', () => {
    it('authentication_required goes straight to the pay link', async () => {
      const { service, db, stripe } = setup();
      stripe.paymentIntents.create.mockRejectedValue(
        cardError('authentication_required'),
      );
      db.onRpc('mark_auction_order_failed', { data: 'requires_action' });
      const outcome = await service.chargeClaimedOrder(baseOrder() as never);
      expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
        p_error_code: 'authentication_required',
        p_requires_action: true,
      });
      expect(outcome.status).toBe('requires_action');
    });

    it.each(['lost_card', 'stolen_card', 'fraudulent'])(
      '%s is not retried and goes to the pay link',
      async (decline) => {
        const { service, db, stripe } = setup();
        stripe.paymentIntents.create.mockRejectedValue(
          cardError('card_declined', decline),
        );
        await service.chargeClaimedOrder(baseOrder() as never);
        expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
          p_error_code: decline,
          p_requires_action: true,
        });
      },
    );

    it('a plain decline retries after 24 hours', async () => {
      const { service, db, stripe } = setup();
      stripe.paymentIntents.create.mockRejectedValue(
        cardError('card_declined', 'insufficient_funds'),
      );
      await service.chargeClaimedOrder(baseOrder() as never);
      expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
        p_error_code: 'card_declined',
        p_requires_action: false,
        p_retry_after_seconds: 86_400,
      });
    });

    it('stops automatic retries after the third attempt', async () => {
      const { service, db, stripe } = setup({ order: { charge_attempts: 3 } });
      stripe.paymentIntents.create.mockRejectedValue(
        cardError('card_declined'),
      );
      await service.chargeClaimedOrder(
        baseOrder({ charge_attempts: 3 }) as never,
      );
      expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
        p_requires_action: true,
      });
    });

    it('a network error leaves the attempt alone (no failure recorded)', async () => {
      const { service, db, stripe } = setup();
      stripe.paymentIntents.create.mockRejectedValue(
        new Stripe.errors.StripeConnectionError({
          type: 'api_error',
          message: 'socket hang up',
        } as never),
      );
      const outcome = await service.chargeClaimedOrder(baseOrder() as never);
      expect(db.rpcArgs('mark_auction_order_failed')).toHaveLength(0);
      expect(db.rpcArgs('mark_auction_order_paid')).toHaveLength(0);
      expect(outcome.status).toBe('pending');
    });

    it.each([
      [
        '5xx',
        () =>
          new Stripe.errors.StripeAPIError({
            type: 'api_error',
            message: 'boom',
          } as never),
      ],
      [
        'rate limit',
        () =>
          new Stripe.errors.StripeRateLimitError({
            type: 'invalid_request_error',
            message: 'slow',
          } as never),
      ],
      ['unexpected', () => new Error('weird')],
    ])('%s error leaves the attempt alone', async (_name, make) => {
      const { service, db, stripe } = setup();
      stripe.paymentIntents.create.mockRejectedValue(make());
      const outcome = await service.chargeClaimedOrder(baseOrder() as never);
      expect(db.rpcArgs('mark_auction_order_failed')).toHaveLength(0);
      expect(outcome.status).toBe('pending');
    });

    it('a transfers-disabled error is a connect problem, not the bidder', async () => {
      const { service, db, stripe } = setup();
      stripe.paymentIntents.create.mockRejectedValue(
        new Stripe.errors.StripeInvalidRequestError({
          type: 'invalid_request_error',
          code: 'transfers_not_allowed',
          message: 'no transfers',
        } as never),
      );
      await service.chargeClaimedOrder(baseOrder() as never);
      expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
        p_error_code: 'connect_unavailable',
        p_requires_action: false,
      });
    });

    it('a non-succeeded PaymentIntent without a thrown error needs the pay link', async () => {
      const { service, db, stripe } = setup();
      stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_x',
        status: 'requires_action',
        last_payment_error: null,
      });
      await service.chargeClaimedOrder(baseOrder() as never);
      expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
        p_requires_action: true,
      });
    });

    it('a processing PaymentIntent is left for the webhook', async () => {
      const { service, db, stripe } = setup();
      stripe.paymentIntents.create.mockResolvedValue({
        id: 'pi_p',
        status: 'processing',
      });
      const outcome = await service.chargeClaimedOrder(baseOrder() as never);
      expect(outcome.status).toBe('pending');
      expect(db.rpcArgs('mark_auction_order_paid')).toHaveLength(0);
      expect(db.rpcArgs('mark_auction_order_failed')).toHaveLength(0);
    });
  });
});

describe('AuctionPaymentsService.chargeOrderNow / retryCharge', () => {
  it('leases a pending order (attempt bumped) before charging', async () => {
    const { service, db, stripe } = setup({
      order: { status: 'pending', charge_attempts: 0 },
    });
    await service.chargeOrderNow('order-1');
    const lease = db.ops('auction_orders', 'update')[0];
    expect(lease.payload).toMatchObject({
      status: 'charging',
      charge_attempts: 1,
    });
    expect(lease.filters).toContainEqual(['eq', 'charge_attempts', 0]);
    expect(lease.filters).toContainEqual(['in', 'status', ['pending']]);
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  });

  it('skips when the order is not pending or the lease is lost', async () => {
    const paid = setup({ order: { status: 'paid' } });
    expect((await paid.service.chargeOrderNow('order-1')).status).toBe(
      'skipped',
    );

    const lost = setup({ order: { status: 'pending', charge_attempts: 0 } });
    lost.db.on('auction_orders.update', { data: [] });
    expect((await lost.service.chargeOrderNow('order-1')).status).toBe(
      'skipped',
    );
    expect(lost.stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('retryCharge refuses after the payment window and for paid orders', async () => {
    const late = setup({ order: { status: 'failed', pay_by_at: PAST } });
    expect((await late.service.retryCharge('order-1')).status).toBe('skipped');
    const paid = setup({ order: { status: 'paid' } });
    expect((await paid.service.retryCharge('order-1')).status).toBe('skipped');
    expect(late.stripe.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('retryCharge leases from failed/requires_action and charges', async () => {
    const { service, db, stripe } = setup({
      order: { status: 'failed', charge_attempts: 1 },
    });
    await service.retryCharge('order-1');
    expect(db.ops('auction_orders', 'update')[0].filters).toContainEqual([
      'in',
      'status',
      ['failed', 'requires_action'],
    ]);
    expect(stripe.paymentIntents.create).toHaveBeenCalledTimes(1);
  });
});

describe('AuctionPaymentsService.recordPayment', () => {
  const total = computeOrderAmounts({
    subtotalCents: 10_000,
    taxCents: 0,
    rate: 0.015,
  }).totalCents;
  const stored = { total_cents: total };

  it('reports only the first flip; later calls return false without error', async () => {
    const { service, db } = setup({ order: stored });
    let calls = 0;
    db.onRpc('mark_auction_order_paid', () => ({ data: calls++ === 0 }));
    expect(
      await service.recordPayment('order-1', 'pi_1', total, {
        verifyAmount: true,
      }),
    ).toBe(true);
    expect(
      await service.recordPayment('order-1', 'pi_1', total, {
        verifyAmount: true,
      }),
    ).toBe(false);
    expect(db.rpcArgs('mark_auction_order_paid')).toHaveLength(2);
  });

  it('does not create a second tax transaction once one is stored', async () => {
    const { service, stripe } = setup({
      order: {
        ...stored,
        tax_calculation_id: 'taxcalc_1',
        tax_transaction_id: 'tax_tr_old',
      },
    });
    await service.recordPayment('order-1', 'pi_1', total, {
      verifyAmount: true,
    });
    expect(
      stripe.tax.transactions.createFromCalculation,
    ).not.toHaveBeenCalled();
  });

  it('refuses webhook input whose amount differs from the stored total', async () => {
    const { service, db } = setup({ order: stored });
    expect(
      await service.recordPayment('order-1', 'pi_1', total - 1, {
        verifyAmount: true,
      }),
    ).toBe(false);
    expect(db.rpcArgs('mark_auction_order_paid')).toHaveLength(0);
    expect(db.ops('auction_audit', 'insert')[0].payload).toMatchObject({
      action: 'payment_amount_mismatch',
    });
  });

  it('refuses webhook input when amounts were never stored', async () => {
    const { service, db } = setup();
    expect(
      await service.recordPayment('order-1', 'pi_1', 5000, {
        verifyAmount: true,
      }),
    ).toBe(false);
    expect(db.rpcArgs('mark_auction_order_paid')).toHaveLength(0);
  });

  it('still marks paid when only the tax transaction fails (audited)', async () => {
    const { service, db, stripe } = setup({
      order: { ...stored, tax_calculation_id: 'taxcalc_1' },
    });
    stripe.tax.transactions.createFromCalculation.mockRejectedValue(
      new Error('nope'),
    );
    expect(
      await service.recordPayment('order-1', 'pi_1', total, {
        verifyAmount: true,
      }),
    ).toBe(true);
    expect(
      db.rpcArgs('mark_auction_order_paid')[0].p_tax_transaction_id,
    ).toBeNull();
    expect(db.ops('auction_audit', 'insert')[0].payload).toMatchObject({
      action: 'tax_transaction_failed',
    });
  });
});

describe('AuctionPaymentsService webhook handlers', () => {
  const total = computeOrderAmounts({
    subtotalCents: 10_000,
    taxCents: 0,
    rate: 0.015,
  }).totalCents;

  it('payment_intent.succeeded marks the order paid when amount and destination match', async () => {
    const { service, db } = setup({ order: { total_cents: total } });
    const changed = await service.handlePaymentIntentSucceeded({
      id: 'pi_9',
      amount_received: total,
      metadata: { auction_order_id: 'order-1' },
      transfer_data: { destination: 'acct_123' },
    } as never);
    expect(changed).toBe(true);
    expect(db.rpcArgs('mark_auction_order_paid')[0]).toMatchObject({
      p_payment_intent: 'pi_9',
    });
  });

  it('payment_intent.succeeded ignores a PaymentIntent with a foreign destination', async () => {
    const { service, db } = setup({ order: { total_cents: total } });
    const changed = await service.handlePaymentIntentSucceeded({
      id: 'pi_9',
      amount_received: total,
      metadata: { auction_order_id: 'order-1' },
      transfer_data: { destination: 'acct_attacker' },
    } as never);
    expect(changed).toBe(false);
    expect(db.rpcArgs('mark_auction_order_paid')).toHaveLength(0);
  });

  it('checkout.session.completed marks paid only for paid sessions', async () => {
    const { service, db } = setup({ order: { total_cents: total } });
    expect(
      await service.handleCheckoutSessionCompleted({
        id: 'cs_1',
        payment_status: 'unpaid',
        payment_intent: 'pi_9',
        amount_total: total,
        metadata: { auction_order_id: 'order-1' },
      } as never),
    ).toBe(false);
    expect(
      await service.handleCheckoutSessionCompleted({
        id: 'cs_1',
        payment_status: 'paid',
        payment_intent: 'pi_9',
        amount_total: total,
        metadata: { auction_order_id: 'order-1' },
      } as never),
    ).toBe(true);
    expect(db.rpcArgs('mark_auction_order_paid')).toHaveLength(1);
  });

  it('payment_intent.payment_failed only audits (once per PaymentIntent) and never re-marks a failure', async () => {
    const { service, db } = setup({ order: { status: 'failed' } });
    let audited = 0;
    db.on('auction_audit.select', () => ({ count: audited }));
    db.on('auction_audit.insert', () => {
      audited += 1;
      return {};
    });
    const intent = {
      id: 'pi_f',
      metadata: { auction_order_id: 'order-1' },
      last_payment_error: { code: 'card_declined' },
    } as never;
    await service.handlePaymentIntentFailed(intent);
    await service.handlePaymentIntentFailed(intent);
    expect(audited).toBe(1);
    expect(db.rpcArgs('mark_auction_order_failed')).toHaveLength(0);
  });

  it('payment_intent.payment_failed applies the failure to a charge left processing', async () => {
    const { service, db } = setup({
      order: { status: 'charging', last_payment_intent_id: 'pi_f' },
    });
    await service.handlePaymentIntentFailed({
      id: 'pi_f',
      metadata: { auction_order_id: 'order-1' },
      last_payment_error: {
        code: 'card_declined',
        decline_code: 'insufficient_funds',
        message: 'no',
      },
    } as never);
    expect(db.rpcArgs('mark_auction_order_failed')[0]).toMatchObject({
      p_error_code: 'card_declined',
      p_requires_action: false,
    });
  });

  it('charge.refunded flags the order and records an audit row without changing status', async () => {
    const { service, db } = setup({
      order: { stripe_payment_intent_id: 'pi_1' },
    });
    const handled = await service.handleChargeRefunded({
      id: 'ch_1',
      payment_intent: 'pi_1',
      amount_refunded: 500,
      refunded: false,
      metadata: {},
    } as never);
    expect(handled).toBe(true);
    const patch = db.ops('auction_orders', 'update')[0].payload as Record<
      string,
      unknown
    >;
    expect(patch.flag_reason).toBe('partially_refunded');
    expect(patch.status).toBeUndefined();
    expect(db.rpcCalls.filter((c) => c.fn.includes('refund'))).toHaveLength(0);
  });

  it('charge.refunded for a non-auction charge is a no-op', async () => {
    const { service, db } = setup();
    db.on('auction_orders.select', { data: null });
    expect(
      await service.handleChargeRefunded({
        id: 'ch_9',
        payment_intent: 'pi_other',
        metadata: {},
      } as never),
    ).toBe(false);
    expect(db.ops('auction_orders', 'update')).toHaveLength(0);
  });

  it('charge.dispute.created flags the order and queues a promoter alert', async () => {
    const { service, db } = setup();
    expect(
      await service.handleDisputeCreated({
        id: 'dp_1',
        payment_intent: 'pi_1',
        charge: 'ch_1',
        reason: 'fraudulent',
        amount: 11_000,
      } as never),
    ).toBe(true);
    expect(
      (db.ops('auction_orders', 'update')[0].payload as Record<string, unknown>)
        .flag_reason,
    ).toBe('disputed');
    expect(db.ops('auction_outbox', 'insert')[0].payload).toMatchObject({
      kind: 'dispute_opened',
    });
  });
});

describe('AuctionPaymentsService card on file', () => {
  const ctx = { bidderId: 'bidder-1', auctionId: 'auction-1' };

  it('creates a SetupIntent for off-session use and returns only the client secret', async () => {
    const { service, stripe } = setup();
    const result = await service.createSetupIntent(ctx);
    expect(result).toEqual({ clientSecret: 'seti_1_secret' });
    expect(stripe.setupIntents.create).toHaveBeenCalledWith({
      customer: 'cus_1',
      usage: 'off_session',
      payment_method_types: ['card'],
      metadata: { auction_bidder_id: 'bidder-1', auction_id: 'auction-1' },
    });
    expect(stripe.customers.create).not.toHaveBeenCalled();
  });

  it('creates and stores a Customer on first use', async () => {
    const { service, stripe, db } = setup({
      bidder: { ...BIDDER, stripe_customer_id: null },
    });
    await service.createSetupIntent(ctx);
    expect(stripe.customers.create).toHaveBeenCalledTimes(1);
    expect(stripe.customers.create.mock.calls[0][1]).toEqual({
      idempotencyKey: 'auction-bidder-customer-bidder-1',
    });
    expect(db.ops('auction_bidders', 'update')[0].payload).toMatchObject({
      stripe_customer_id: 'cus_new',
    });
    expect(stripe.setupIntents.create.mock.calls[0][0].customer).toBe(
      'cus_new',
    );
  });

  it('rejects a blocked bidder and a bidder from another auction', async () => {
    const blocked = setup({
      bidder: { ...BIDDER, blocked_at: new Date().toISOString() },
    });
    await expect(blocked.service.createSetupIntent(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const other = setup({ bidder: { ...BIDDER, auction_id: 'auction-2' } });
    await expect(other.service.createSetupIntent(ctx)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  const succeeded = (over: Record<string, unknown> = {}) => ({
    id: 'seti_1',
    status: 'succeeded',
    customer: 'cus_1',
    payment_method: 'pm_new',
    metadata: { auction_bidder_id: 'bidder-1' },
    ...over,
  });

  it('confirm re-reads the SetupIntent from Stripe and stores brand and last4', async () => {
    const { service, stripe, db } = setup();
    stripe.setupIntents.retrieve.mockResolvedValue(succeeded());
    const result = await service.confirmCard(ctx, 'seti_1');
    expect(stripe.setupIntents.retrieve).toHaveBeenCalledWith('seti_1');
    expect(result).toEqual({
      cardStatus: 'ready',
      cardBrand: 'visa',
      cardLast4: '4242',
    });
    expect(db.ops('auction_bidders', 'update')[0].payload).toMatchObject({
      stripe_payment_method_id: 'pm_new',
      card_brand: 'visa',
      card_last4: '4242',
      card_status: 'ready',
    });
    expect(stripe.paymentMethods.detach).toHaveBeenCalledWith('pm_1');
  });

  it('confirm rejects a SetupIntent that belongs to a different bidder', async () => {
    const { service, stripe, db } = setup();
    stripe.setupIntents.retrieve.mockResolvedValue(
      succeeded({ metadata: { auction_bidder_id: 'bidder-2' } }),
    );
    await expect(service.confirmCard(ctx, 'seti_1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(db.ops('auction_bidders', 'update')).toHaveLength(0);
  });

  it('confirm rejects a SetupIntent whose customer differs from the bidder', async () => {
    const { service, stripe } = setup();
    stripe.setupIntents.retrieve.mockResolvedValue(
      succeeded({ customer: 'cus_other' }),
    );
    await expect(service.confirmCard(ctx, 'seti_1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('confirm rejects an incomplete SetupIntent and a malformed id without calling Stripe', async () => {
    const { service, stripe } = setup();
    stripe.setupIntents.retrieve.mockResolvedValue(
      succeeded({ status: 'requires_payment_method' }),
    );
    await expect(service.confirmCard(ctx, 'seti_1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    stripe.setupIntents.retrieve.mockClear();
    await expect(service.confirmCard(ctx, 'pm_123')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(stripe.setupIntents.retrieve).not.toHaveBeenCalled();
  });

  it('webhook setup_intent.succeeded saves the card and is idempotent', async () => {
    const { service, db } = setup({
      bidder: {
        ...BIDDER,
        card_status: 'ready',
        stripe_payment_method_id: 'pm_new',
      },
    });
    expect(await service.handleSetupIntentSucceeded(succeeded() as never)).toBe(
      true,
    );
    expect(db.ops('auction_bidders', 'update')).toHaveLength(0);
  });

  it('webhook ignores a SetupIntent without auction metadata', async () => {
    const { service } = setup();
    expect(
      await service.handleSetupIntentSucceeded(
        succeeded({ metadata: {} }) as never,
      ),
    ).toBe(false);
  });
});

describe('AuctionPaymentsService pay link', () => {
  it('stores only the SHA-256 hash and expires with pay_by_at', async () => {
    const { service, db, state } = setup({ order: { status: 'failed' } });
    db.on('auction_orders.update', { data: [{ id: 'order-1' }] });
    const { url, expiresAt } = await service.issuePayLink(state.order as never);

    const token = url.replace('https://app.test/auctions/pay/', '');
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const patch = db.ops('auction_orders', 'update')[0].payload as Record<
      string,
      unknown
    >;
    expect(patch.pay_token_hash).toBe(hashPayToken(token));
    expect(JSON.stringify(patch)).not.toContain(token);
    expect(patch.pay_token_expires_at).toBe(FUTURE);
    expect(expiresAt).toBe(FUTURE);
  });

  it('issues a different token every time', async () => {
    const { service, db, state } = setup({ order: { status: 'failed' } });
    db.on('auction_orders.update', { data: [{ id: 'order-1' }] });
    const a = await service.issuePayLink(state.order as never);
    const b = await service.issuePayLink(state.order as never);
    expect(a.url).not.toBe(b.url);
  });

  it('sendPayLink emails (and texts) a fresh link, but not for a paid order', async () => {
    const { service, db, mail, sms } = setup({ order: { status: 'failed' } });
    db.on('auction_orders.update', { data: [{ id: 'order-1' }] });
    expect(await service.sendPayLink('order-1')).toEqual({ sent: true });
    expect(mail.sendPayLink).toHaveBeenCalledTimes(1);
    expect(sms.send).toHaveBeenCalledTimes(1);

    const paid = setup({ order: { status: 'paid' } });
    expect(await paid.service.sendPayLink('order-1')).toEqual({ sent: false });
    expect(paid.mail.sendPayLink).not.toHaveBeenCalled();
  });

  const token = 'A'.repeat(43);

  it('rejects malformed, unknown and expired tokens', async () => {
    const a = setup();
    await expect(a.service.getPaySummary('short')).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const b = setup();
    b.db.on('auction_orders.select', { data: null });
    await expect(b.service.getPaySummary(token)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    const c = setup({
      order: { status: 'failed', pay_token_expires_at: PAST },
    });
    await expect(c.service.getPaySummary(token)).rejects.toBeInstanceOf(
      GoneException,
    );
  });

  it('looks the order up by token hash', async () => {
    const { service, db } = setup({ order: { status: 'failed' } });
    await service.getPaySummary(token);
    expect(db.ops('auction_orders', 'select')[0].filters).toContainEqual([
      'eq',
      'pay_token_hash',
      hashPayToken(token),
    ]);
  });

  it('summary exposes only the first name and a masked email', async () => {
    const { service } = setup({ order: { status: 'failed' } });
    const summary = await service.getPaySummary(token);
    expect(summary.firstName).toBe('Sam');
    expect(summary.maskedEmail).toBe('s***@example.com');
    expect(summary.payable).toBe(true);
    const text = JSON.stringify(summary);
    expect(text).not.toContain('sam@example.com');
    expect(text).not.toContain('Winner');
    expect(text).not.toContain('+1555');
  });

  describe('createPayCheckout', () => {
    const total = computeOrderAmounts({
      subtotalCents: 10_000,
      taxCents: 0,
      rate: 0.015,
    });
    const ready = {
      status: 'failed',
      total_cents: total.totalCents,
      application_fee_cents: total.applicationFeeCents,
      platform_fee_cents: total.platformFeeCents,
      processing_fee_cents: total.processingFeeCents,
      last_payment_intent_id: 'pi_open',
    };

    it('cancels open PaymentIntents first, then creates a session that totals the order', async () => {
      const { service, db, stripe } = setup({ order: ready });
      db.on('auction_orders.update', { data: [{ id: 'order-1' }] });
      const order: string[] = [];
      stripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_open',
        status: 'requires_payment_method',
      });
      stripe.paymentIntents.cancel.mockImplementation(() => {
        order.push('cancel');
        return Promise.resolve({});
      });
      stripe.checkout.sessions.create.mockImplementation(() => {
        order.push('session');
        return Promise.resolve({ id: 'cs_1', url: 'https://stripe.test/cs_1' });
      });

      const result = await service.createPayCheckout(token);

      expect(result).toEqual({ url: 'https://stripe.test/cs_1' });
      expect(order).toEqual(['cancel', 'session']);
      const params = stripe.checkout.sessions.create.mock.calls[0][0];
      const sum = params.line_items.reduce(
        (
          s: number,
          l: { price_data: { unit_amount: number }; quantity: number },
        ) => s + l.price_data.unit_amount * l.quantity,
        0,
      );
      expect(sum).toBe(total.totalCents);
      expect(params).toMatchObject({
        mode: 'payment',
        customer: 'cus_1',
        metadata: { auction_order_id: 'order-1' },
        payment_intent_data: {
          application_fee_amount: total.applicationFeeCents,
          transfer_data: { destination: 'acct_123' },
          metadata: { auction_order_id: 'order-1' },
        },
      });
    });

    it('stops automatic retries before creating the session', async () => {
      const { service, db, stripe } = setup({
        order: { ...ready, last_payment_intent_id: null },
      });
      db.on('auction_orders.update', { data: [{ id: 'order-1' }] });
      await service.createPayCheckout(token);
      expect(db.ops('auction_orders', 'update')[0].payload).toMatchObject({
        status: 'requires_action',
      });
      expect(stripe.checkout.sessions.create).toHaveBeenCalled();
    });

    it('refuses to create a session when a PaymentIntent already succeeded', async () => {
      const { service, db, stripe } = setup({ order: ready });
      db.on('auction_orders.update', { data: [{ id: 'order-1' }] });
      stripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_open',
        status: 'succeeded',
        amount_received: total.totalCents,
      });
      await expect(service.createPayCheckout(token)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
      expect(db.rpcArgs('mark_auction_order_paid')).toHaveLength(1);
    });

    it('refuses an order that is mid-charge or already paid', async () => {
      const charging = setup({ order: { ...ready, status: 'charging' } });
      await expect(
        charging.service.createPayCheckout(token),
      ).rejects.toBeInstanceOf(ConflictException);
      const paid = setup({ order: { ...ready, status: 'paid' } });
      await expect(
        paid.service.createPayCheckout(token),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(charging.stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });

    it('refuses to checkout if the retry hold cannot be taken (order moved on)', async () => {
      const { service, db, stripe } = setup({ order: ready });
      db.on('auction_orders.update', { data: [] });
      await expect(service.createPayCheckout(token)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });
});

describe('AuctionPaymentsService.detachStaleCards', () => {
  it('detaches cards of bidders with no open or recent orders', async () => {
    const { service, db, stripe } = setup();
    db.on('auctions.select', { data: [{ id: 'auction-1' }] });
    db.on('auction_bidders.select', {
      data: [{ id: 'bidder-1', stripe_payment_method_id: 'pm_1' }],
    });
    db.on('auction_orders.select', { count: 0 });
    expect(await service.detachStaleCards()).toBe(1);
    expect(stripe.paymentMethods.detach).toHaveBeenCalledWith('pm_1');
    expect(db.ops('auction_bidders', 'update')[0].payload).toMatchObject({
      card_status: 'none',
      stripe_payment_method_id: null,
    });
  });

  it('keeps the card while an order is still open', async () => {
    const { service, db, stripe } = setup();
    db.on('auctions.select', { data: [{ id: 'auction-1' }] });
    db.on('auction_bidders.select', {
      data: [{ id: 'bidder-1', stripe_payment_method_id: 'pm_1' }],
    });
    db.on('auction_orders.select', { count: 1 });
    expect(await service.detachStaleCards()).toBe(0);
    expect(stripe.paymentMethods.detach).not.toHaveBeenCalled();
  });
});
