import { grossUp } from '../promoter-events/promoter-events.service';
import {
  applicationFeeCents,
  chargeTotalWithProcessing,
  processingFeeCents,
  STRIPE_CARD_FIXED_CENTS,
  STRIPE_CARD_PCT,
} from './platform-fee';

/** What Stripe bills the platform for a card charge. */
const stripeBill = (chargedCents: number) =>
  Math.round(chargedCents * STRIPE_CARD_PCT) + STRIPE_CARD_FIXED_CENTS;

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
        expect(Math.abs(platformNet - platformFee)).toBeLessThanOrEqual(1);
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
        expect(Math.abs(platformNet - total * rate)).toBeLessThanOrEqual(2);
      }
    },
  );

  it('charge total helper matches the existing 2.9% + $0.30 gross-up', () => {
    expect(chargeTotalWithProcessing(10000)).toBe(
      Math.round((10000 + 30) / 0.971),
    );
    expect(processingFeeCents(10000)).toBe(
      chargeTotalWithProcessing(10000) - 10000,
    );
  });
});
