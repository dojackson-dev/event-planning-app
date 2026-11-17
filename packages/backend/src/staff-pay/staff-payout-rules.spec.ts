import {
  accountReadyForTransfers,
  parseServiceFeePercent,
  quotePayout,
  toCents,
} from './staff-payout-rules';

describe('toCents', () => {
  it('converts dollars without float drift', () => {
    expect(toCents('110.00')).toBe(11000);
    expect(toCents(83.25)).toBe(8325);
    expect(toCents(0.1 + 0.2)).toBe(30);
    expect(toCents(null)).toBe(0);
  });
});

describe('quotePayout', () => {
  it('charges the venue the payroll plus the card fee, so workers get every cent approved', () => {
    const q = quotePayout(11000, 'card', 0);
    expect(q.payroll_cents).toBe(11000);
    expect(q.service_fee_cents).toBe(0);
    expect(q.total_cents).toBe(q.payroll_cents + q.processing_fee_cents);
    // after Stripe's ~2.9% + 30c (+0.2% allowance) the platform still holds the payroll
    const stripeFee = Math.round(q.total_cents * 0.029 + 30);
    expect(q.total_cents - stripeFee).toBeGreaterThanOrEqual(11000);
  });

  it('adds the optional service fee before the processing fee', () => {
    const q = quotePayout(10000, 'card', 2);
    expect(q.service_fee_cents).toBe(200);
    expect(q.total_cents).toBe(10200 + q.processing_fee_cents);
  });

  it('caps the bank fee', () => {
    const q = quotePayout(5_000_000, 'bank', 0);
    expect(q.processing_fee_cents).toBe(500);
    expect(quotePayout(10000, 'bank', 0).processing_fee_cents).toBeLessThan(
      quotePayout(10000, 'card', 0).processing_fee_cents,
    );
  });
});

describe('parseServiceFeePercent', () => {
  it('defaults to no fee and ignores junk', () => {
    expect(parseServiceFeePercent(undefined)).toBe(0);
    expect(parseServiceFeePercent('')).toBe(0);
    expect(parseServiceFeePercent('abc')).toBe(0);
    expect(parseServiceFeePercent('-3')).toBe(0);
  });
  it('accepts a percent up to 10', () => {
    expect(parseServiceFeePercent('1.5')).toBe(1.5);
    expect(parseServiceFeePercent('50')).toBe(10);
  });
});

describe('accountReadyForTransfers', () => {
  const ready = {
    details_submitted: true,
    payouts_enabled: true,
    capabilities: { transfers: 'active', tax_reporting_us_1099_misc: 'active' },
  };

  it('needs details, payouts, transfers and the 1099 capability all active', () => {
    expect(accountReadyForTransfers(ready)).toBe(true);
    expect(
      accountReadyForTransfers({
        ...ready,
        capabilities: { ...ready.capabilities, transfers: 'inactive' },
      }),
    ).toBe(false);
    expect(accountReadyForTransfers({ details_submitted: false })).toBe(false);
  });

  it('does not count a worker whose tax details Stripe does not have yet', () => {
    expect(
      accountReadyForTransfers({
        ...ready,
        capabilities: {
          transfers: 'active',
          tax_reporting_us_1099_misc: 'inactive',
        },
      }),
    ).toBe(false);
    expect(
      accountReadyForTransfers({
        ...ready,
        capabilities: { transfers: 'active' },
      }),
    ).toBe(false);
  });
});
