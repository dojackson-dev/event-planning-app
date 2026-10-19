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

export type PayMethod = 'card' | 'pay_later' | 'bank';

/** ACH Direct Debit: 0.8% with a $5 cap on Stripe's side. */
export const BANK_PROCESSING_PCT = 0.008;
export const BANK_FEE_CAP_CENTS = 500;

/** `bank` is only honoured where the caller allows it (invoices); anything else falls back to card. */
export function normalizePayMethod(
  value: unknown,
  allowBank = false,
): PayMethod {
  if (value === 'pay_later') return 'pay_later';
  if (value === 'bank' && allowBank) return 'bank';
  return 'card';
}

/** The bank cap is applied in chargeTotalWithProcessing; the percentage here ignores it. */
export function processingRate(method: PayMethod = 'card'): {
  pct: number;
  fixedCents: number;
} {
  if (method === 'bank') return { pct: BANK_PROCESSING_PCT, fixedCents: 0 };
  return method === 'pay_later'
    ? { pct: PAY_LATER_PROCESSING_PCT, fixedCents: PAY_LATER_FIXED_CENTS }
    : { pct: CARD_PROCESSING_PCT, fixedCents: STRIPE_CARD_FIXED_CENTS };
}

/** Customer-facing rate text, e.g. "3.1% + $0.30". */
export function processingRateLabel(method: PayMethod = 'card'): string {
  if (method === 'bank') {
    return `${Number((BANK_PROCESSING_PCT * 100).toFixed(2))}% (max $${BANK_FEE_CAP_CENTS / 100})`;
  }
  const { pct, fixedCents } = processingRate(method);
  return `${Number((pct * 100).toFixed(2))}% + $${(fixedCents / 100).toFixed(2)}`;
}

/** Name and description for the processing-fee line on a checkout. */
export function processingFeeLine(method: PayMethod = 'card'): {
  name: string;
  description: string;
} {
  const rate = processingRateLabel(method);
  if (method === 'pay_later') {
    return {
      name: 'Pay-later Processing Fee',
      description: `Afterpay / Klarna / Affirm processing fee (${rate})`,
    };
  }
  if (method === 'bank') {
    return {
      name: 'Bank Payment Processing Fee',
      description: `Bank account (ACH) processing fee (${rate})`,
    };
  }
  return {
    name: 'Payment Processing Fee',
    description: `Card processing fee (${rate})`,
  };
}

/** Total to charge so that, after Stripe's fee for `method`, `netCents` remains. */
export function chargeTotalWithProcessing(
  netCents: number,
  method: PayMethod = 'card',
): number {
  if (method === 'bank') {
    const uncapped = Math.round(netCents / (1 - BANK_PROCESSING_PCT));
    return uncapped - netCents > BANK_FEE_CAP_CENTS
      ? netCents + BANK_FEE_CAP_CENTS
      : uncapped;
  }
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

/**
 * Total for a bank payment against a card-priced total (artist invoices bake the card fee into the invoice):
 * the payer pays only what the bank fee costs, so the platform still nets the same amount.
 */
export function bankTotalForCardTotalCents(cardTotalCents: number): number {
  const netAfterCard =
    cardTotalCents * (1 - CARD_PROCESSING_PCT) - STRIPE_CARD_FIXED_CENTS;
  const uncapped = Math.ceil(netAfterCard / (1 - BANK_PROCESSING_PCT));
  const total =
    uncapped - netAfterCard > BANK_FEE_CAP_CENTS
      ? Math.ceil(netAfterCard) + BANK_FEE_CAP_CENTS
      : uncapped;
  return Math.min(cardTotalCents, Math.max(0, total));
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

/** Checkout payment_method_types; rejects pay-later and bank when the seller hasn't enabled them. */
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
  if (method === 'bank') {
    if (!enableBnpl || !opts.bankDebit)
      throw new BadRequestException(
        'Bank payment is not available for this seller',
      );
    return ['us_bank_account'];
  }
  return ['card'];
}
