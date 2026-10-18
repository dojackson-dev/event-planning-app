import { BadRequestException, Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';

describe('Stripe webhook signature', () => {
  it('rejects a bad signature with 400 so it is not treated as a server error', async () => {
    const service = Object.create(StripeService.prototype) as StripeService;
    Object.assign(service, {
      webhookSecret: 'whsec_test',
      connectWebhookSecret: '',
      logger: new Logger('test'),
      stripe: {
        webhooks: {
          constructEvent: () => {
            throw new Error('No signatures found matching');
          },
        },
      },
    });
    await expect(
      service.handleWebhook(Buffer.from('{}'), 't=1,v1=bad'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
