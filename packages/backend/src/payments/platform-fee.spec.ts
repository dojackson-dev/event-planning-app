import { grossUp } from '../promoter-events/promoter-events.service';
import {
  applicationFeeCents,
  chargeTotalWithProcessing,
  normalizePayMethod,
  PAY_LATER_FIXED_CENTS,
  PAY_LATER_METHODS,
  PAY_LATER_PROCESSING_PCT,
  payLaterSurchargeCents,
  paymentMethodTypesFor,
  processingFeeCents,
  processingRateLabel,
  STRIPE_CARD_FIXED_CENTS,
  STRIPE_CARD_PCT,
} from './platform-fee';

/** What Stripe bills the platform for a domestic card charge. */
const stripeBill = (chargedCents: number) =>
  Math.round(chargedCents * STRIPE_CARD_PCT) + STRIPE_CARD_FIXED_CENTS;

/** What Stripe bills the platform for Afterpay / Klarna / Affirm (highest rate). */
const payLaterBill = (chargedCents: number) =>
  Math.round(chargedCents * PAY_LATER_PROCESSING_PCT) + PAY_LATER_FIXED_CENTS;

// The payer is charged 0.2% above Stripe's 2.9% to cover international cards, so the platform never nets less than its fee.
const ALLOWANCE = 0.002;

describe('platform fee is always kept in full', () => {
  it.each([5000, 24750, 100000, 250000])(
    'invoice-style charge: platform nets its fee on %i cents at 3%% and 1.5%%',
    (amount) => {
      for (const rate of [0.03, 0.015, 0.01]) {
        const platformFee = Math.round(amount * rate);
        const fee = processingFeeCents(amount);
        const charged = amount + fee;
        const appFee = applicationFeeCents(platformFee, fee);
        const platformNet = appFee - stripeBill(charged);
        const recipientNet = charged - appFee;
        expect(platformNet - platformFee).toBeGreaterThanOrEqual(-1);
        expect(platformNet - platformFee).toBeLessThanOrEqual(
          charged * ALLOWANCE + 1,
        );
        expect(recipientNet).toBe(amount - platformFee);
      }
    },
  );

  it.each([2000, 10000, 100000])(
    'ticket-style charge: application fee = total - price leaves the promoter the price and us the platform fee (%i cents)',
    (price) => {
      for (const rate of [0.03, 0.015]) {
        const total = grossUp(price, rate);
        const appFee = total - price;
        expect(total - appFee).toBe(price);
        const platformNet = appFee - stripeBill(total);
        expect(platformNet - total * rate).toBeGreaterThanOrEqual(-2);
        expect(platformNet - total * rate).toBeLessThanOrEqual(
          total * ALLOWANCE + 2,
        );
      }
    },
  );

  it.each([2000, 10000, 100000])(
    'pay-later ticket charge still leaves the platform its fee (%i cents)',
    (price) => {
      for (const rate of [0.03, 0.015]) {
        const total = grossUp(price, rate, 'pay_later');
        const appFee = total - price;
        const platformNet = appFee - payLaterBill(total);
        expect(Math.abs(platformNet - total * rate)).toBeLessThanOrEqual(2);
      }
    },
  );

  it.each([5000, 24750, 100000])(
    'pay-later invoice charge leaves the platform its fee (%i cents)',
    (amount) => {
      const platformFee = Math.round(amount * 0.03);
      const fee = processingFeeCents(amount, 'pay_later');
      const charged = amount + fee;
      const appFee = applicationFeeCents(platformFee, fee);
      expect(
        Math.abs(appFee - payLaterBill(charged) - platformFee),
      ).toBeLessThanOrEqual(1);
      expect(charged - appFee).toBe(amount - platformFee);
    },
  );

  it('pay-later surcharge on a card total matches pricing the invoice for pay-later directly', () => {
    const base = 10000;
    const cardTotal = base + processingFeeCents(base, 'card');
    const payLaterTotal = cardTotal + payLaterSurchargeCents(cardTotal);
    const net = (total: number, pct: number, fixed: number) =>
      total - Math.round(total * pct) - fixed;
    expect(
      Math.abs(
        net(payLaterTotal, PAY_LATER_PROCESSING_PCT, PAY_LATER_FIXED_CENTS) -
          net(cardTotal, 0.031, STRIPE_CARD_FIXED_CENTS),
      ),
    ).toBeLessThanOrEqual(2);
  });

  it('card charge total includes the 0.2% international allowance', () => {
    expect(chargeTotalWithProcessing(10000)).toBe(
      Math.round((10000 + 30) / (1 - 0.031)),
    );
    expect(processingFeeCents(10000)).toBe(
      chargeTotalWithProcessing(10000) - 10000,
    );
  });

  it('picks payment methods by buyer choice and seller opt-in', () => {
    expect(normalizePayMethod('pay_later')).toBe('pay_later');
    expect(normalizePayMethod('anything')).toBe('card');
    expect(paymentMethodTypesFor(false, 'card')).toEqual(['card']);
    expect(paymentMethodTypesFor(true, 'card')).toEqual(['card']);
    expect(paymentMethodTypesFor(true, 'card', { bankDebit: true })).toEqual([
      'card',
      'us_bank_account',
    ]);
    expect(paymentMethodTypesFor(true, 'pay_later')).toEqual([
      ...PAY_LATER_METHODS,
    ]);
    expect(() => paymentMethodTypesFor(false, 'pay_later')).toThrow();
    expect(processingRateLabel('card')).toBe('3.1% + $0.30');
    expect(processingRateLabel('pay_later')).toBe('6% + $0.30');
  });
});
