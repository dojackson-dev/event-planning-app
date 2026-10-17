/**
 * Platform-fee rule: EventEcos always keeps its full platform fee. Stripe bills the
 * platform account for card processing on Connect destination charges, so the
 * application fee must be platform fee + Stripe's processing fee, and the payer
 * is charged that processing fee on top of the invoice amount.
 */
export const STRIPE_CARD_PCT = 0.029;
export const STRIPE_CARD_FIXED_CENTS = 30;

/** Total to charge so that, after Stripe's card fee, `netCents` remains. */
export function chargeTotalWithProcessing(netCents: number): number {
  return Math.round(
    (netCents + STRIPE_CARD_FIXED_CENTS) / (1 - STRIPE_CARD_PCT),
  );
}

/** Processing fee shown to the payer on top of `netCents`. */
export function processingFeeCents(netCents: number): number {
  return chargeTotalWithProcessing(netCents) - netCents;
}

/** application_fee_amount that leaves the platform exactly its platform fee after Stripe's bill. */
export function applicationFeeCents(
  platformFeeCents: number,
  processingFee: number,
): number {
  return platformFeeCents + processingFee;
}
