import { Logger } from '@nestjs/common';
import { StripeService } from './stripe.service';

function setup(handled = true) {
  const markRefunded = jest.fn().mockResolvedValue(handled);
  const service = Object.create(StripeService.prototype) as StripeService;
  Object.assign(service, {
    vendorInvoicesService: { markInvoiceRefundedByPaymentIntent: markRefunded },
    logger: new Logger('test'),
  });
  const run = (charge: Record<string, unknown>) =>
    (service as any).handleChargeRefunded(charge) as Promise<void>;
  return { run, markRefunded };
}

describe('charge.refunded webhook', () => {
  it('passes the payment intent, refunded amount and full-refund flag to vendor invoices', async () => {
    const { run, markRefunded } = setup();
    await run({
      payment_intent: 'pi_1',
      amount_refunded: 45363,
      refunded: true,
      metadata: { vendor_invoice_id: 'v1' },
    });
    expect(markRefunded).toHaveBeenCalledWith('pi_1', 45363, true);
  });

  it('still looks up the vendor invoice when the charge carries no metadata', async () => {
    const { run, markRefunded } = setup(false);
    await run({
      payment_intent: { id: 'pi_2' },
      amount_refunded: 100,
      refunded: false,
      metadata: {},
    });
    expect(markRefunded).toHaveBeenCalledWith('pi_2', 100, false);
  });

  it('leaves other invoice types alone', async () => {
    const { run, markRefunded } = setup();
    await run({
      payment_intent: 'pi_3',
      amount_refunded: 100,
      refunded: true,
      metadata: { invoice_id: 'i1' },
    });
    await run({
      payment_intent: 'pi_4',
      amount_refunded: 100,
      refunded: true,
      metadata: { artist_invoice_id: 'a1' },
    });
    await run({
      payment_intent: 'pi_5',
      amount_refunded: 100,
      refunded: true,
      metadata: { promoter_invoice_id: 'p1' },
    });
    expect(markRefunded).not.toHaveBeenCalled();
  });

  it('ignores a refunded charge that has no payment intent', async () => {
    const { run, markRefunded } = setup();
    await run({
      payment_intent: null,
      amount_refunded: 100,
      refunded: true,
      metadata: {},
    });
    expect(markRefunded).not.toHaveBeenCalled();
  });
});
