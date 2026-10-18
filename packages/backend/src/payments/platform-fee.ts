import { BadRequestException } from '@nestjs/common';
import type Stripe from 'stripe';

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

export const MAX_SALES_TAX_RATE_PCT = 20;

/** Seller-entered tax percent for an event; invalid or missing values mean no tax. */
export function salesTaxRatePct(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.min(n, MAX_SALES_TAX_RATE_PCT) : 0;
}

/**
 * Ticket/VIP order pricing when the seller owes sales tax. Tax applies to the price and the service fee,
 * passes 100% to the seller, and Stripe's fee on the tax is covered by the service fee.
 * The promoter nets `subtotalCents` + tax; the platform keeps `serviceFee` (its fee plus Stripe's bill).
 */
export function ticketPricing(
  subtotalCents: number,
  feeRate: number,
  method: PayMethod = 'card',
  taxRate = 0,
): { serviceFee: number; tax: number; total: number } {
  const rate = salesTaxRatePct(taxRate);
  if (rate === 0) {
    const total = grossUp(subtotalCents, feeRate, method);
    return { serviceFee: total - subtotalCents, tax: 0, total };
  }
  const { pct, fixedCents } = processingRate(method);
  const k = rate / 100;
  const q = feeRate + pct * (1 + k);
  const serviceFee = Math.ceil((q * subtotalCents + fixedCents) / (1 - q));
  const tax = Math.round(k * (subtotalCents + serviceFee));
  return { serviceFee, tax, total: subtotalCents + serviceFee + tax };
}

/** Checkout lines for the service fee and, when the seller charges tax, a separate sales tax line. */
export function serviceFeeLines(
  serviceFee: number,
  tax: number,
  taxRate: number,
  feeDescription: string,
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const lines: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: 'usd',
        product_data: { name: 'Service fee', description: feeDescription },
        unit_amount: serviceFee,
      },
      quantity: 1,
    },
  ];
  if (tax > 0) {
    lines.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Sales tax (${Number(salesTaxRatePct(taxRate).toFixed(3))}%)`,
          description: 'Collected on behalf of the event organizer',
        },
        unit_amount: tax,
      },
      quantity: 1,
    });
  }
  return lines;
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
