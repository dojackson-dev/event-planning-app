import Stripe from 'stripe';
import { StripeService } from '../../stripe/stripe.service';

const signer = new Stripe('sk_test_unused');
const SECRET = 'whsec_test';

function setup() {
  const auction = {
    handleSetupIntentSucceeded: jest.fn().mockResolvedValue(true),
    handlePaymentIntentSucceeded: jest.fn().mockResolvedValue(true),
    handlePaymentIntentFailed: jest.fn().mockResolvedValue(true),
    handleCheckoutSessionCompleted: jest.fn().mockResolvedValue(true),
    handleChargeRefunded: jest.fn().mockResolvedValue(false),
    handleDisputeCreated: jest.fn().mockResolvedValue(false),
  };
  const invoiceHandlers = {
    markInvoicePaid: jest.fn().mockResolvedValue(undefined),
    handleCheckoutComplete: jest.fn().mockResolvedValue(undefined),
    handlePaymentIntentSucceeded: jest.fn().mockResolvedValue(undefined),
    handlePaymentIntentFailed: jest.fn().mockResolvedValue(undefined),
  };
  const service = Object.create(StripeService.prototype) as Record<
    string,
    unknown
  >;
  Object.assign(service, {
    stripe: signer,
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    webhookSecret: SECRET,
    connectWebhookSecret: '',
    auctionPayments: auction,
    handleCheckoutComplete: invoiceHandlers.handleCheckoutComplete,
    handlePaymentIntentSucceeded: invoiceHandlers.handlePaymentIntentSucceeded,
    handlePaymentIntentFailed: invoiceHandlers.handlePaymentIntentFailed,
  });
  return {
    service: service as unknown as StripeService,
    auction,
    invoiceHandlers,
  };
}

async function send(
  service: StripeService,
  type: string,
  object: Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  const payload = JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type,
    data: { object: object },
    ...extra,
  });
  await service.handleWebhook(
    Buffer.from(payload),
    signer.webhooks.generateTestHeaderString({ payload, secret: SECRET }),
  );
}

describe('StripeService webhook: auction branches', () => {
  it('routes setup_intent.succeeded with auction metadata to the auction service', async () => {
    const { service, auction } = setup();
    await send(service, 'setup_intent.succeeded', {
      id: 'seti_1',
      object: 'setup_intent',
      metadata: { auction_bidder_id: 'bidder-1' },
    });
    expect(auction.handleSetupIntentSucceeded).toHaveBeenCalledTimes(1);
  });

  it('ignores setup_intent.succeeded without auction metadata', async () => {
    const { service, auction } = setup();
    await send(service, 'setup_intent.succeeded', {
      id: 'seti_2',
      object: 'setup_intent',
      metadata: {},
    });
    expect(auction.handleSetupIntentSucceeded).not.toHaveBeenCalled();
  });

  it('routes payment_intent.succeeded with auction_order_id to auction only, not the invoice handler', async () => {
    const { service, auction, invoiceHandlers } = setup();
    await send(service, 'payment_intent.succeeded', {
      id: 'pi_1',
      object: 'payment_intent',
      metadata: { auction_order_id: 'order-1' },
    });
    expect(auction.handlePaymentIntentSucceeded).toHaveBeenCalledTimes(1);
    expect(invoiceHandlers.handlePaymentIntentSucceeded).not.toHaveBeenCalled();
  });

  it('leaves an invoice payment_intent.succeeded to the existing handler', async () => {
    const { service, auction, invoiceHandlers } = setup();
    await send(service, 'payment_intent.succeeded', {
      id: 'pi_2',
      object: 'payment_intent',
      metadata: { invoice_id: 'inv-1' },
    });
    expect(auction.handlePaymentIntentSucceeded).not.toHaveBeenCalled();
    expect(invoiceHandlers.handlePaymentIntentSucceeded).toHaveBeenCalledTimes(
      1,
    );
  });

  it('routes payment_intent.payment_failed with auction metadata only; the existing failure handler stays unwired', async () => {
    const { service, auction, invoiceHandlers } = setup();
    await send(service, 'payment_intent.payment_failed', {
      id: 'pi_3',
      object: 'payment_intent',
      metadata: { auction_order_id: 'order-1' },
    });
    await send(service, 'payment_intent.payment_failed', {
      id: 'pi_4',
      object: 'payment_intent',
      metadata: { invoice_id: 'inv-1' },
    });
    expect(auction.handlePaymentIntentFailed).toHaveBeenCalledTimes(1);
    expect(invoiceHandlers.handlePaymentIntentFailed).not.toHaveBeenCalled();
  });

  it('routes checkout.session.completed with auction_order_id to auction, not the existing handler', async () => {
    const { service, auction, invoiceHandlers } = setup();
    await send(service, 'checkout.session.completed', {
      id: 'cs_1',
      object: 'checkout.session',
      metadata: { auction_order_id: 'order-1' },
    });
    expect(auction.handleCheckoutSessionCompleted).toHaveBeenCalledTimes(1);
    expect(invoiceHandlers.handleCheckoutComplete).not.toHaveBeenCalled();
  });

  it('leaves other checkout sessions to the existing handler', async () => {
    const { service, auction, invoiceHandlers } = setup();
    await send(service, 'checkout.session.completed', {
      id: 'cs_2',
      object: 'checkout.session',
      metadata: { invoice_id: 'inv-1' },
    });
    expect(auction.handleCheckoutSessionCompleted).not.toHaveBeenCalled();
    expect(invoiceHandlers.handleCheckoutComplete).toHaveBeenCalledTimes(1);
  });

  it('ignores auction metadata on events from connected accounts', async () => {
    const { service, auction, invoiceHandlers } = setup();
    await send(
      service,
      'payment_intent.succeeded',
      {
        id: 'pi_5',
        object: 'payment_intent',
        metadata: { auction_order_id: 'order-1' },
      },
      { account: 'acct_attacker' },
    );
    expect(auction.handlePaymentIntentSucceeded).not.toHaveBeenCalled();
    expect(invoiceHandlers.handlePaymentIntentSucceeded).toHaveBeenCalledTimes(
      1,
    );
  });

  it('delegates charge.refunded and charge.dispute.created and swallows their errors', async () => {
    const { service, auction } = setup();
    auction.handleChargeRefunded.mockRejectedValue(new Error('db down'));
    await expect(
      send(service, 'charge.refunded', {
        id: 'ch_1',
        object: 'charge',
        metadata: {},
      }),
    ).resolves.toBeUndefined();
    await send(service, 'charge.dispute.created', {
      id: 'dp_1',
      object: 'dispute',
    });
    expect(auction.handleChargeRefunded).toHaveBeenCalledTimes(1);
    expect(auction.handleDisputeCreated).toHaveBeenCalledTimes(1);
  });

  it('works when the auction module is not provided', async () => {
    const { service, invoiceHandlers } = setup();
    (service as unknown as { auctionPayments: unknown }).auctionPayments =
      undefined;
    await send(service, 'payment_intent.succeeded', {
      id: 'pi_6',
      object: 'payment_intent',
      metadata: { auction_order_id: 'order-1' },
    });
    expect(invoiceHandlers.handlePaymentIntentSucceeded).toHaveBeenCalledTimes(
      1,
    );
  });

  it('lets an auction handler error fail the webhook so Stripe retries', async () => {
    const { service, auction } = setup();
    auction.handlePaymentIntentSucceeded.mockRejectedValue(
      new Error('rpc failed'),
    );
    await expect(
      send(service, 'payment_intent.succeeded', {
        id: 'pi_7',
        object: 'payment_intent',
        metadata: { auction_order_id: 'order-1' },
      }),
    ).rejects.toThrow('rpc failed');
  });
});
