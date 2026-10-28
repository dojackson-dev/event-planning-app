import { ForbiddenException } from '@nestjs/common';
import type Stripe from 'stripe';
import { settlePreviousCheckout } from './previous-checkout';

function setup(session: unknown, retrieveFails = false) {
  const expire = jest.fn().mockResolvedValue({});
  const retrieve = retrieveFails
    ? jest.fn().mockRejectedValue(new Error('network'))
    : jest.fn().mockResolvedValue(session);
  const stripe = {
    checkout: { sessions: { retrieve, expire } },
  } as unknown as Stripe;
  const record = jest.fn().mockResolvedValue(undefined);
  return { stripe, expire, retrieve, record };
}

describe('settlePreviousCheckout', () => {
  it('does nothing when the invoice has no earlier session', async () => {
    const { stripe, retrieve, record } = setup({});
    await settlePreviousCheckout(stripe, null, record);
    expect(retrieve).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('expires an earlier session that is still open so it cannot be paid', async () => {
    const { stripe, expire, record } = setup({ status: 'open' });
    await settlePreviousCheckout(stripe, 'cs_old', record);
    expect(expire).toHaveBeenCalledWith('cs_old');
    expect(record).not.toHaveBeenCalled();
  });

  it('records a submitted bank payment as processing and refuses a second checkout', async () => {
    const { stripe, expire, record } = setup({
      status: 'complete',
      payment_status: 'unpaid',
      payment_intent: 'pi_1',
    });
    await expect(
      settlePreviousCheckout(stripe, 'cs_old', record),
    ).rejects.toThrow(ForbiddenException);
    expect(record).toHaveBeenCalledWith('cs_old', 'pi_1');
    expect(expire).not.toHaveBeenCalled();
  });

  it('lets a new checkout proceed after an earlier session that was paid or expired', async () => {
    for (const session of [
      { status: 'complete', payment_status: 'paid' },
      { status: 'expired', payment_status: 'unpaid' },
    ]) {
      const { stripe, expire, record } = setup(session);
      await expect(
        settlePreviousCheckout(stripe, 'cs_old', record),
      ).resolves.toBeUndefined();
      expect(expire).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    }
  });

  it('never blocks a payment because Stripe could not be reached or the session would not expire', async () => {
    const down = setup(null, true);
    await expect(
      settlePreviousCheckout(down.stripe, 'cs_old', down.record),
    ).resolves.toBeUndefined();

    const stuck = setup({ status: 'open' });
    stuck.expire.mockRejectedValueOnce(new Error('already completed'));
    await expect(
      settlePreviousCheckout(stuck.stripe, 'cs_old', stuck.record),
    ).resolves.toBeUndefined();
  });
});
