import Stripe from 'stripe';
import { StripeService } from './stripe.service';

const stripe = new Stripe('sk_test_unused');
const secret = 'whsec_test';

function setup() {
  const staffPayouts = {
    onCheckoutCompleted: jest.fn().mockResolvedValue(undefined),
    onAsyncPaymentSucceeded: jest.fn().mockResolvedValue(undefined),
    onPaymentFailed: jest.fn().mockResolvedValue(undefined),
    handleAccountUpdated: jest.fn().mockResolvedValue(false),
  };
  const invoiceTouch = jest.fn();
  const admin = { from: invoiceTouch };
  const service = Object.create(StripeService.prototype) as Record<
    string,
    unknown
  >;
  Object.assign(service, {
    stripe,
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    webhookSecret: secret,
    connectWebhookSecret: '',
    staffPayouts,
    supabaseService: { getAdminClient: () => admin },
  });
  return {
    service: service as unknown as StripeService,
    staffPayouts,
    invoiceTouch,
  };
}

function send(
  service: StripeService,
  type: string,
  object: Record<string, unknown>,
) {
  const payload = JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type,
    data: { object },
  });
  return service.handleWebhook(
    Buffer.from(payload),
    stripe.webhooks.generateTestHeaderString({ payload, secret }),
  );
}

const session = {
  id: 'cs_1',
  object: 'checkout.session',
  payment_status: 'paid',
  payment_intent: 'pi_1',
  metadata: { staff_payout_id: 'p1' },
};

describe('staff payout checkouts in the Stripe webhook', () => {
  it('routes a completed checkout to staff payouts and nothing else', async () => {
    const { service, staffPayouts, invoiceTouch } = setup();
    await send(service, 'checkout.session.completed', session);
    expect(staffPayouts.onCheckoutCompleted).toHaveBeenCalledTimes(1);
    expect(invoiceTouch).not.toHaveBeenCalled();
  });

  it('routes a cleared bank debit', async () => {
    const { service, staffPayouts, invoiceTouch } = setup();
    await send(service, 'checkout.session.async_payment_succeeded', session);
    expect(staffPayouts.onAsyncPaymentSucceeded).toHaveBeenCalledTimes(1);
    expect(invoiceTouch).not.toHaveBeenCalled();
  });

  it('routes a failed bank debit and an expired checkout', async () => {
    const { service, staffPayouts, invoiceTouch } = setup();
    await send(service, 'checkout.session.async_payment_failed', session);
    await send(service, 'checkout.session.expired', session);
    expect(staffPayouts.onPaymentFailed).toHaveBeenCalledTimes(2);
    expect(invoiceTouch).not.toHaveBeenCalled();
  });

  it('ignores an expired checkout that is not a staff payment', async () => {
    const { service, staffPayouts } = setup();
    await send(service, 'checkout.session.expired', {
      ...session,
      metadata: {},
    });
    expect(staffPayouts.onPaymentFailed).not.toHaveBeenCalled();
  });

  it("lets staff payouts handle a worker's account update first", async () => {
    const { service, staffPayouts, invoiceTouch } = setup();
    staffPayouts.handleAccountUpdated.mockResolvedValue(true);
    await send(service, 'account.updated', {
      id: 'acct_w',
      object: 'account',
      metadata: { staff_member_id: 'm1' },
    });
    expect(staffPayouts.handleAccountUpdated).toHaveBeenCalledTimes(1);
    expect(invoiceTouch).not.toHaveBeenCalled();
  });
});
