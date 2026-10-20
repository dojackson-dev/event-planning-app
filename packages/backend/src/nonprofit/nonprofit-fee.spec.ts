import {
  APP_FEE_RATE,
  grossUp,
  platformFeeRate,
} from '../promoter-events/promoter-events.service';
import { isVerifiedNonprofit, NONPROFIT_APP_FEE_RATE } from './nonprofit-gate';

describe('non-profit platform fee', () => {
  it('uses 1.5% only for verified non-profits', () => {
    expect(NONPROFIT_APP_FEE_RATE).toBe(0.015);
    expect(
      platformFeeRate({ is_nonprofit: true, nonprofit_status: 'verified' }),
    ).toBe(0.015);
    expect(
      platformFeeRate({ is_nonprofit: true, nonprofit_status: 'rejected' }),
    ).toBe(APP_FEE_RATE);
    expect(
      platformFeeRate({ is_nonprofit: false, nonprofit_status: 'verified' }),
    ).toBe(APP_FEE_RATE);
    expect(platformFeeRate(null)).toBe(0.03);
    expect(isVerifiedNonprofit(undefined)).toBe(false);
  });

  it('grossUp defaults to the 3% rate and is cheaper for buyers at 1.5%', () => {
    expect(grossUp(100000)).toBe(106529);
    expect(grossUp(100000, 0.015)).toBe(104854);
    expect(grossUp(5000, 0.015)).toBeLessThan(grossUp(5000));
  });

  it('application fee leaves the promoter the price and us the full platform fee after Stripe', () => {
    const face = 25000;
    const total = grossUp(face, 0.015);
    const appFee = total - face;
    const stripeFee = Math.round(total * 0.029) + 30;
    expect(total - appFee).toBe(face);
    // Stripe's real card bill is 2.9% + $0.30; the 0.2% allowance for international cards is extra margin.
    const margin = appFee - stripeFee - total * 0.015;
    expect(margin).toBeGreaterThanOrEqual(-2);
    expect(margin).toBeLessThanOrEqual(total * 0.002 + 2);
  });
});
