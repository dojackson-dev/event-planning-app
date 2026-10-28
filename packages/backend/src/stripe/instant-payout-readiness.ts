import type Stripe from 'stripe';

export type InstantPayoutState =
  | 'not_connected'
  | 'setup_incomplete'
  | 'needs_debit_card'
  | 'ready';

export interface InstantPayoutReadiness {
  state: InstantPayoutState;
  /** Last four digits of the instant-eligible debit card, when the eligible destination is a card. */
  debitCardLast4: string | null;
  headline: string;
  detail: string;
}

type PayoutDestination = Stripe.BankAccount | Stripe.Card;

function instantEligible(destination: PayoutDestination): boolean {
  const methods = destination.available_payout_methods ?? [];
  return (methods as string[]).includes('instant');
}

/**
 * Instant Payouts need an instant-eligible debit card on the connected account.
 * A bank account alone only gets standard payouts, so that case asks for a card.
 */
export function describeInstantPayouts(
  account: Stripe.Account | null,
): InstantPayoutReadiness {
  if (!account) {
    return {
      state: 'not_connected',
      debitCardLast4: null,
      headline: 'Instant payouts not set up',
      detail:
        'Connect your account with Stripe first, then add a debit card to get paid within minutes.',
    };
  }

  if (!account.payouts_enabled) {
    return {
      state: 'setup_incomplete',
      debitCardLast4: null,
      headline: 'Finish Stripe setup for instant payouts',
      detail:
        'Stripe still needs a few details before payouts are turned on. Finish your Stripe setup, then add a debit card.',
    };
  }

  const destinations = (account.external_accounts?.data ??
    []) as PayoutDestination[];
  const eligible = destinations.find(instantEligible);
  if (eligible) {
    const last4 = eligible.last4 ?? null;
    const kind = eligible.object === 'card' ? 'debit card' : 'bank account';
    return {
      state: 'ready',
      debitCardLast4: eligible.object === 'card' ? last4 : null,
      headline: 'Instant payouts are set up',
      detail: last4
        ? `Your ${kind} ending in ${last4} can receive payouts within minutes.`
        : 'Your account can receive payouts within minutes.',
    };
  }

  return {
    state: 'needs_debit_card',
    debitCardLast4: null,
    headline: 'Add a debit card for instant payouts',
    detail:
      'Your bank account gets standard payouts (a few days). Add a Visa or Mastercard debit card in your Stripe payout settings to get paid within minutes.',
  };
}
