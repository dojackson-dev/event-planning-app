import { grossUp } from '../promoter-events/promoter-events.service';
import {
  applicationFeeCents,
  bankTotalForCardTotalCents,
  chargeTotalWithProcessing,
  normalizePayMethod,
  PAY_LATER_FIXED_CENTS,
  PAY_LATER_METHODS,
  PAY_LATER_PROCESSING_PCT,
  payLaterSurchargeCents,
  paymentMethodTypesFor,
  processingFeeCents,
  processingFeeLine,
  processingRateLabel,
  salesTaxRatePct,
  serviceFeeLines,
  STRIPE_CARD_FIXED_CENTS,
  STRIPE_CARD_PCT,
  ticketPricing,
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
    ]);
    expect(paymentMethodTypesFor(true, 'bank', { bankDebit: true })).toEqual([
      'us_bank_account',
    ]);
    expect(() =>
      paymentMethodTypesFor(false, 'bank', { bankDebit: true }),
    ).toThrow();
    expect(() => paymentMethodTypesFor(true, 'bank')).toThrow();
    expect(
      paymentMethodTypesFor(false, 'bank', {
        bankDebit: true,
        bankAlways: true,
      }),
    ).toEqual(['us_bank_account']);
    expect(paymentMethodTypesFor(true, 'pay_later')).toEqual([
      ...PAY_LATER_METHODS,
    ]);
    expect(() => paymentMethodTypesFor(false, 'pay_later')).toThrow();
    expect(processingRateLabel('card')).toBe('3.1% + $0.30');
    expect(processingRateLabel('pay_later')).toBe('6% + $0.30');
    expect(processingRateLabel('bank')).toBe('0.8% (max $5)');
  });

  it('only accepts the bank method where the caller allows it', () => {
    expect(normalizePayMethod('bank')).toBe('card');
    expect(normalizePayMethod('bank', true)).toBe('bank');
    expect(normalizePayMethod('pay_later', true)).toBe('pay_later');
    expect(normalizePayMethod(undefined, true)).toBe('card');
  });
});

/** What Stripe bills the platform for ACH Direct Debit: 0.8%, capped at $5. */
const bankBill = (chargedCents: number) =>
  Math.min(Math.round(chargedCents * 0.008), 500);

describe('bank (ACH) processing', () => {
  it('charges 0.8% below the $5 cap', () => {
    expect(chargeTotalWithProcessing(50000, 'bank')).toBe(
      Math.round(50000 / (1 - 0.008)),
    );
    expect(processingFeeCents(50000, 'bank')).toBe(403);
  });

  it('stops at $5 from about $625 up', () => {
    expect(processingFeeCents(60000, 'bank')).toBe(484);
    expect(processingFeeCents(63000, 'bank')).toBe(500);
    expect(processingFeeCents(200000, 'bank')).toBe(500);
  });

  it('never charges more than $5 of processing, however large the amount', () => {
    expect(processingFeeCents(1_000_000, 'bank')).toBe(500);
    expect(processingFeeCents(100_000_000, 'bank')).toBe(500);
  });

  it('costs the payer far less than a card on a large invoice', () => {
    expect(processingFeeCents(500000, 'bank')).toBeLessThan(
      processingFeeCents(500000, 'card') / 3,
    );
  });

  it('leaves the platform at least its fee after Stripe bills the ACH fee', () => {
    for (const net of [1000, 5000, 20000, 200000, 6_000_000, 50_000_000]) {
      const total = chargeTotalWithProcessing(net, 'bank');
      const platformFee = Math.round(net * 0.03);
      const applicationFee = applicationFeeCents(
        platformFee,
        processingFeeCents(net, 'bank'),
      );
      const platformNet = applicationFee - bankBill(total);
      expect(platformNet).toBeGreaterThanOrEqual(platformFee - 1);
      expect(platformNet).toBeLessThanOrEqual(platformFee + 1);
    }
  });

  it('prices a bank payment against an invoice that already bakes in the card fee', () => {
    const cardTotal = chargeTotalWithProcessing(200000, 'card');
    const bankTotal = bankTotalForCardTotalCents(cardTotal);
    expect(bankTotal).toBeLessThan(cardTotal);
    // After Stripe's ACH fee the bank total leaves what the card total's 3.1% + $0.30 rate was meant to leave.
    const target = cardTotal * (1 - 0.031) - 30;
    expect(bankTotal - bankBill(bankTotal)).toBeGreaterThanOrEqual(target - 2);
    expect(bankTotal - bankBill(bankTotal)).toBeLessThanOrEqual(target + 2);
  });

  it('never raises the price of a card-priced total', () => {
    expect(bankTotalForCardTotalCents(100)).toBeLessThanOrEqual(100);
    expect(bankTotalForCardTotalCents(0)).toBe(0);
  });

  it('describes the bank fee line', () => {
    expect(processingFeeLine('bank')).toEqual({
      name: 'Bank Payment Processing Fee',
      description: 'Bank account (ACH) processing fee (0.8% (max $5))',
    });
    expect(processingFeeLine('card').name).toBe('Payment Processing Fee');
    expect(processingFeeLine('pay_later').name).toBe(
      'Pay-later Processing Fee',
    );
  });
});

describe('seller-set sales tax on tickets', () => {
  it('with no tax rate it matches the plain gross-up exactly', () => {
    for (const price of [2000, 5000, 100000]) {
      const p = ticketPricing(price, 0.03, 'card', 0);
      expect(p.tax).toBe(0);
      expect(p.total).toBe(grossUp(price, 0.03));
    }
  });

  it.each([
    [5000, 0.03, 7],
    [10000, 0.015, 8.25],
    [100000, 0.03, 6.5],
  ])(
    'price %i at fee %d and tax %d%%: promoter nets price + tax, platform keeps its fee after Stripe',
    (price, feeRate, taxPct) => {
      const { serviceFee, tax, total } = ticketPricing(
        price,
        feeRate,
        'card',
        taxPct,
      );
      expect(total).toBe(price + serviceFee + tax);
      // tax is charged on the price and the service fee
      expect(
        Math.abs(tax - (taxPct / 100) * (price + serviceFee)),
      ).toBeLessThanOrEqual(0.5);
      // promoter receives total minus the application fee (= service fee)
      expect(total - serviceFee).toBe(price + tax);
      // platform nets the service fee less Stripe's bill on the whole charge (tax included)
      const platformNet = serviceFee - stripeBill(total);
      const platformFee = feeRate * (price + serviceFee);
      expect(platformNet - platformFee).toBeGreaterThanOrEqual(-2);
    },
  );

  it('pay-later also covers Stripe on the tax', () => {
    const { serviceFee, total } = ticketPricing(10000, 0.03, 'pay_later', 8);
    expect(
      serviceFee - payLaterBill(total) - 0.03 * (10000 + serviceFee),
    ).toBeGreaterThanOrEqual(-2);
  });

  it('ignores invalid, negative and excessive tax rates', () => {
    expect(salesTaxRatePct('abc')).toBe(0);
    expect(salesTaxRatePct(-5)).toBe(0);
    expect(salesTaxRatePct(undefined)).toBe(0);
    expect(salesTaxRatePct(99)).toBe(20);
    expect(salesTaxRatePct('8.25')).toBe(8.25);
  });

  it('adds a separate Sales tax line only when tax applies', () => {
    expect(serviceFeeLines(500, 0, 0, 'x')).toHaveLength(1);
    const lines = serviceFeeLines(500, 40, 8.25, 'x');
    expect(lines).toHaveLength(2);
    expect(lines[1].price_data?.product_data?.name).toBe('Sales tax (8.25%)');
    expect(lines[1].price_data?.unit_amount).toBe(40);
  });
});
