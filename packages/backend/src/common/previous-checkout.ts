import { ForbiddenException } from '@nestjs/common';
import type Stripe from 'stripe';

/**
 * Each Pay Now click creates a new Stripe Checkout session, and the invoice remembers only the latest one.
 * Before creating another, deal with the one we already issued so a payer with two pages open cannot pay twice:
 * - a bank debit already submitted (complete but unpaid) is recorded as processing and the new checkout is refused;
 * - a session still open is expired so its page can no longer be paid.
 * Lookup failures never block a payment; the guard only acts on what Stripe confirms.
 */
export async function settlePreviousCheckout(
  stripe: Stripe,
  previousSessionId: string | null | undefined,
  recordBankPayment: (
    sessionId: string,
    paymentIntentId: string | null,
  ) => Promise<unknown>,
): Promise<void> {
  if (!previousSessionId) return;

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(previousSessionId);
  } catch {
    return;
  }

  if (session?.status === 'complete' && session.payment_status === 'unpaid') {
    const paymentIntentId =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);
    await recordBankPayment(previousSessionId, paymentIntentId);
    throw new ForbiddenException(
      'A bank payment for this invoice is already processing',
    );
  }

  if (session?.status === 'open') {
    try {
      await stripe.checkout.sessions.expire(previousSessionId);
    } catch {
      // Already expired or completed in the meantime; the next webhook settles it.
    }
  }
}
