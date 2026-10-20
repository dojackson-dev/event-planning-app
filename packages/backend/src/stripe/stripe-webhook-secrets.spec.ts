import Stripe from 'stripe';
import { StripeService } from './stripe.service';

const stripe = new Stripe('sk_test_unused');
const secrets = { platform: 'whsec_platform', connect: 'whsec_connect' };

function setup(configured: {
  webhookSecret?: string;
  connectWebhookSecret?: string;
}) {
  const service = Object.create(StripeService.prototype) as Record<
    string,
    unknown
  >;
  const onAccountUpdated = jest.fn().mockResolvedValue(undefined);
  Object.assign(service, {
    stripe,
    logger: {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    webhookSecret: configured.webhookSecret ?? '',
    connectWebhookSecret: configured.connectWebhookSecret ?? '',
    handleConnectAccountUpdated: onAccountUpdated,
  });
  return { service: service as unknown as StripeService, onAccountUpdated };
}

function signed(secret: string) {
  const payload = JSON.stringify({
    id: 'evt_1',
    object: 'event',
    type: 'account.updated',
    account: 'acct_vendor',
    data: { object: { id: 'acct_vendor', object: 'account' } },
  });
  return {
    rawBody: Buffer.from(payload),
    signature: stripe.webhooks.generateTestHeaderString({ payload, secret }),
  };
}

describe('StripeService.handleWebhook signing secrets', () => {
  const both = {
    webhookSecret: secrets.platform,
    connectWebhookSecret: secrets.connect,
  };

  it('accepts an event signed by the platform destination', async () => {
    const { service, onAccountUpdated } = setup(both);
    const { rawBody, signature } = signed(secrets.platform);
    await service.handleWebhook(rawBody, signature);
    expect(onAccountUpdated).toHaveBeenCalledTimes(1);
  });

  it('accepts an event signed by the connected-accounts destination', async () => {
    const { service, onAccountUpdated } = setup(both);
    const { rawBody, signature } = signed(secrets.connect);
    await service.handleWebhook(rawBody, signature);
    expect(onAccountUpdated).toHaveBeenCalledTimes(1);
  });

  it('rejects an event signed with an unknown secret', async () => {
    const { service, onAccountUpdated } = setup(both);
    const { rawBody, signature } = signed('whsec_attacker');
    await expect(service.handleWebhook(rawBody, signature)).rejects.toThrow(
      'Webhook error',
    );
    expect(onAccountUpdated).not.toHaveBeenCalled();
  });

  it('does not accept the connect secret when only the platform secret is configured', async () => {
    const { service } = setup({ webhookSecret: secrets.platform });
    const { rawBody, signature } = signed(secrets.connect);
    await expect(service.handleWebhook(rawBody, signature)).rejects.toThrow(
      'Webhook error',
    );
  });
});
