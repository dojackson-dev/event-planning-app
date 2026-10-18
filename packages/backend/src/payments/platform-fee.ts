import { BadRequestException } from '@nestjs/common';

/**
 * Platform-fee rule: EventEcos always keeps its full platform fee. Stripe bills the
 * platform account for processing on Connect destination charges, so the
 * application fee must be platform fee + Stripe's processing fee, and the payer
 * is charged that processing fee on top of the invoice amount.
 */
export const STRIPE_CARD_PCT = 0.029;
export const STRIPE_CARD_FIXED_CENTS = 30;

/** Allowance on top of Stripe's 2.9% for international cards (+1.5%) and currency conversion, which can't be known before payment. */
export const INTL_CARD_ALLOWANCE_PCT = 0.002;

/** Card rate charged to the payer. */
export const CARD_PROCESSING_PCT = STRIPE_CARD_PCT + INTL_CARD_ALLOWANCE_PCT;

/** Afterpay / Affirm are 6% + $0.30, Klarna 5.99% + $0.30 - use the highest. */
export const PAY_LATER_PROCESSING_PCT = 0.06;
export const PAY_LATER_FIXED_CENTS = 30;

export const PAY_LATER_METHODS = [
  'afterpay_clearpay',
  'klarna',
  'affirm',
] as const;

export type PayMethod = 'card' | 'pay_later';

export function normalizePayMethod(value: unknown): PayMethod {
  return value === 'pay_later' ? 'pay_later' : 'card';
}

export function processingRate(method: PayMethod = 'card'): {
  pct: number;
  fixedCents: number;
} {
  return method === 'pay_later'
    ? { pct: PAY_LATER_PROCESSING_PCT, fixedCents: PAY_LATER_FIXED_CENTS }
    : { pct: CARD_PROCESSING_PCT, fixedCents: STRIPE_CARD_FIXED_CENTS };
}

/** Customer-facing rate text, e.g. "3.1% + $0.30". */
export function processingRateLabel(method: PayMethod = 'card'): string {
  const { pct, fixedCents } = processingRate(method);
  return `${Number((pct * 100).toFixed(2))}% + $${(fixedCents / 100).toFixed(2)}`;
}

/** Total to charge so that, after Stripe's fee for `method`, `netCents` remains. */
export function chargeTotalWithProcessing(
  netCents: number,
  method: PayMethod = 'card',
): number {
  const { pct, fixedCents } = processingRate(method);
  return Math.round((netCents + fixedCents) / (1 - pct));
}

/** Processing fee shown to the payer on top of `netCents`. */
export function processingFeeCents(
  netCents: number,
  method: PayMethod = 'card',
): number {
  return chargeTotalWithProcessing(netCents, method) - netCents;
}

/** Ticket/VIP total so the promoter nets `ticketTotalCents` after processing and the platform fee. */
export function grossUp(
  ticketTotalCents: number,
  feeRate = 0.03,
  method: PayMethod = 'card',
): number {
  const { pct, fixedCents } = processingRate(method);
  return Math.ceil((ticketTotalCents + fixedCents) / (1 - pct - feeRate));
}

/** Extra on a card-priced total so a pay-later payment leaves the same amount after Stripe's higher fee. */
export function payLaterSurchargeCents(cardTotalCents: number): number {
  const total = Math.ceil(
    (cardTotalCents * (1 - CARD_PROCESSING_PCT)) /
      (1 - PAY_LATER_PROCESSING_PCT),
  );
  return total - cardTotalCents;
}

/** application_fee_amount that leaves the platform exactly its platform fee after Stripe's bill. */
export function applicationFeeCents(
  platformFeeCents: number,
  processingFee: number,
): number {
  return platformFeeCents + processingFee;
}

/** Checkout payment_method_types; rejects pay-later when the seller hasn't enabled it. */
export function paymentMethodTypesFor(
  enableBnpl: boolean | null | undefined,
  method: PayMethod,
  opts: { bankDebit?: boolean } = {},
): Array<'card' | 'us_bank_account' | (typeof PAY_LATER_METHODS)[number]> {
  if (method === 'pay_later') {
    if (!enableBnpl)
      throw new BadRequestException(
        'Pay later is not available for this seller',
      );
    return [...PAY_LATER_METHODS];
  }
  return enableBnpl && opts.bankDebit ? ['card', 'us_bank_account'] : ['card'];
}
