import {
  STRIPE_CARD_FIXED_CENTS,
  STRIPE_CARD_PCT,
} from '../payments/platform-fee';
import {
  antiSnipeEndsAt,
  AUCTION_DEFAULT_EXPOSURE_LIMIT_CENTS,
  AUCTION_PAYMENT_GRACE_HOURS,
  AUCTION_PLATFORM_FEE_RATE,
  bidIncrementCents,
  computeOrderAmounts,
  isBuyNowAvailable,
  minNextBidCents,
  resolveProxyBid,
  type ProxyBidAccepted,
  type ProxyBidInput,
  type ProxyBidResult,
  type ProxyBidRow,
  type ProxyItemState,
} from './auction-money';

/** What Stripe bills the platform for a card charge. */
const stripeBill = (chargedCents: number) =>
  Math.round(chargedCents * STRIPE_CARD_PCT) + STRIPE_CARD_FIXED_CENTS;

function accepted(result: ProxyBidResult): ProxyBidAccepted {
  if (!result.ok) throw new Error(`rejected: ${result.code}`);
  return result;
}

const bid = (
  bidderId: string,
  amountCents: number,
  mode: ProxyBidInput['mode'] = 'max',
  ownMaxCents: number | null = null,
): ProxyBidInput => ({ bidderId, amountCents, mode, ownMaxCents });

const manual = (
  bidderId: string,
  amountCents: number,
  maxAmountCents: number,
): ProxyBidRow => ({ bidderId, amountCents, maxAmountCents, kind: 'manual' });

const auto = (
  bidderId: string,
  amountCents: number,
  maxAmountCents: number,
): ProxyBidRow => ({
  bidderId,
  amountCents,
  maxAmountCents,
  kind: 'proxy_auto',
});

describe('auction defaults', () => {
  it('uses the 1.5% non-profit rate, $5,000 exposure and a 72h grace', () => {
    expect(AUCTION_PLATFORM_FEE_RATE).toBe(0.015);
    expect(AUCTION_DEFAULT_EXPOSURE_LIMIT_CENTS).toBe(500_000);
    expect(AUCTION_PAYMENT_GRACE_HOURS).toBe(72);
  });
});

describe('bidIncrementCents', () => {
  it.each([
    [0, 100],
    [2_499, 100],
    [2_500, 250],
    [4_999, 250],
    [5_000, 500],
    [9_999, 500],
    [10_000, 1_000],
    [24_999, 1_000],
    [25_000, 2_500],
    [49_999, 2_500],
    [50_000, 5_000],
    [99_999, 5_000],
    [100_000, 10_000],
    [5_000_000, 10_000],
  ])('price %i cents -> increment %i cents', (price, expected) => {
    expect(bidIncrementCents(price)).toBe(expected);
  });

  it('prefers a positive per-item override and ignores invalid ones', () => {
    expect(bidIncrementCents(500, 50)).toBe(50);
    expect(bidIncrementCents(500, 0)).toBe(100);
    expect(bidIncrementCents(500, null)).toBe(100);
  });
});

describe('minNextBidCents / isBuyNowAvailable', () => {
  const state = (currentPriceCents: number, bidCount: number) => ({
    currentPriceCents,
    bidCount,
    startingBidCents: 1_000,
  });

  it('is the starting bid until the first bid, then price + increment', () => {
    expect(minNextBidCents(state(0, 0))).toBe(1_000);
    expect(minNextBidCents(state(1_000, 1))).toBe(1_100);
    expect(minNextBidCents(state(2_500, 5))).toBe(2_750);
    expect(
      minNextBidCents({ ...state(1_000, 2), incrementOverrideCents: 50 }),
    ).toBe(1_050);
  });

  it('removes buy-it-now after the first bid', () => {
    expect(isBuyNowAvailable({ buyNowCents: 20_000, bidCount: 0 })).toBe(true);
    expect(isBuyNowAvailable({ buyNowCents: 20_000, bidCount: 1 })).toBe(false);
    expect(isBuyNowAvailable({ buyNowCents: null, bidCount: 0 })).toBe(false);
  });
});

describe('resolveProxyBid', () => {
  const item = (over: Partial<ProxyItemState> = {}): ProxyItemState => ({
    currentPriceCents: 0,
    bidCount: 0,
    startingBidCents: 1_000,
    incrementOverrideCents: null,
    leaderBidderId: null,
    leaderMaxCents: null,
    ...over,
  });

  it('first max bid leads at the starting bid', () => {
    const r = accepted(resolveProxyBid(item(), bid('a', 5_000)));
    expect(r.outcome).toBe('leading');
    expect(r.priceCents).toBe(1_000);
    expect(r.leaderBidderId).toBe('a');
    expect(r.leaderMaxCents).toBe(5_000);
    expect(r.leaderChanged).toBe(true);
    expect(r.outbidBidderId).toBeNull();
    expect(r.bids).toEqual([manual('a', 1_000, 5_000)]);
  });

  it('first manual bid sets the price to the bid', () => {
    const r = accepted(resolveProxyBid(item(), bid('a', 2_000, 'manual')));
    expect(r.priceCents).toBe(2_000);
    expect(r.bids).toEqual([manual('a', 2_000, 2_000)]);
  });

  it('rejects a first bid below the starting bid', () => {
    expect(resolveProxyBid(item(), bid('a', 999))).toEqual({
      ok: false,
      code: 'bid_too_low',
      minNextBidCents: 1_000,
    });
  });

  it('rejects malformed amounts', () => {
    for (const amountCents of [0, -5, 1.5, 10_000_001]) {
      const r = resolveProxyBid(item(), bid('a', amountCents));
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('invalid_amount');
    }
  });

  describe('against an incumbent leader', () => {
    const led = (over: Partial<ProxyItemState> = {}) =>
      item({
        currentPriceCents: 1_000,
        bidCount: 1,
        leaderBidderId: 'a',
        leaderMaxCents: 5_000,
        ...over,
      });
    const stepped = { currentPriceCents: 3_250, bidCount: 3 };

    it('is outbid by the leader proxy and the price steps up', () => {
      const r = accepted(resolveProxyBid(led(), bid('b', 3_000)));
      expect(r.outcome).toBe('outbid');
      expect(r.priceCents).toBe(3_250);
      expect(r.leaderBidderId).toBe('a');
      expect(r.leaderChanged).toBe(false);
      expect(r.outbidBidderId).toBeNull();
      expect(r.bids).toEqual([
        manual('b', 3_000, 3_000),
        auto('a', 3_250, 5_000),
      ]);
    });

    it('caps the proxy price at the leader max', () => {
      const r = accepted(resolveProxyBid(led(), bid('b', 4_900)));
      expect(r.priceCents).toBe(5_000);
      expect(r.leaderBidderId).toBe('a');
    });

    it('a manual bid below the leader max is also answered by the proxy', () => {
      const r = accepted(
        resolveProxyBid(led(stepped), bid('b', 4_000, 'manual')),
      );
      expect(r.priceCents).toBe(4_250);
      expect(r.leaderBidderId).toBe('a');
      expect(r.bids.map((b) => b.kind)).toEqual(['manual', 'proxy_auto']);
    });

    it('tie goes to the earliest max (the incumbent)', () => {
      const r = accepted(
        resolveProxyBid(led({ leaderMaxCents: 3_000 }), bid('b', 3_000)),
      );
      expect(r.outcome).toBe('outbid');
      expect(r.leaderBidderId).toBe('a');
      expect(r.priceCents).toBe(3_000);
      expect(r.leaderChanged).toBe(false);
    });

    it('raising a max up to the leader max still loses the tie', () => {
      const r = accepted(
        resolveProxyBid(led(stepped), bid('b', 5_000, 'max', 3_000)),
      );
      expect(r.leaderBidderId).toBe('a');
      expect(r.priceCents).toBe(5_000);
    });

    it('a higher max takes the lead one increment above the old max', () => {
      const r = accepted(
        resolveProxyBid(led(stepped), bid('b', 6_000, 'max', 3_000)),
      );
      expect(r.outcome).toBe('leading');
      expect(r.leaderBidderId).toBe('b');
      expect(r.priceCents).toBe(5_500);
      expect(r.leaderChanged).toBe(true);
      expect(r.outbidBidderId).toBe('a');
      expect(r.bids).toEqual([
        auto('a', 5_000, 5_000),
        manual('b', 5_500, 6_000),
      ]);
    });

    it('the new price never exceeds the challenger max', () => {
      const r = accepted(resolveProxyBid(led(stepped), bid('b', 5_100)));
      expect(r.leaderBidderId).toBe('b');
      expect(r.priceCents).toBe(5_100);
    });

    it('a manual bid above the leader max sets the price to the bid', () => {
      const r = accepted(
        resolveProxyBid(led(stepped), bid('b', 6_000, 'manual')),
      );
      expect(r.leaderBidderId).toBe('b');
      expect(r.priceCents).toBe(6_000);
    });

    it('writes no proxy row when the leader already sits at their max', () => {
      const r = accepted(
        resolveProxyBid(
          led({ currentPriceCents: 5_000, bidCount: 4 }),
          bid('b', 6_000),
        ),
      );
      expect(r.priceCents).toBe(5_500);
      expect(r.bids).toEqual([manual('b', 5_500, 6_000)]);
    });

    it('rejects bids below price + increment', () => {
      expect(
        resolveProxyBid(
          led({ leaderMaxCents: 3_000, bidCount: 2 }),
          bid('b', 1_050),
        ),
      ).toEqual({ ok: false, code: 'bid_too_low', minNextBidCents: 1_100 });
    });

    it('uses the per-item increment override', () => {
      const r = accepted(
        resolveProxyBid(
          led({
            leaderMaxCents: 2_000,
            bidCount: 2,
            incrementOverrideCents: 50,
          }),
          bid('b', 1_050),
        ),
      );
      expect(r.priceCents).toBe(1_100);
    });

    it('applies the tier increment at the $25 boundary', () => {
      const state = led({
        currentPriceCents: 2_400,
        bidCount: 2,
        leaderMaxCents: 10_000,
      });
      expect(resolveProxyBid(state, bid('b', 2_450))).toEqual({
        ok: false,
        code: 'bid_too_low',
        minNextBidCents: 2_500,
      });

      const r = accepted(resolveProxyBid(state, bid('b', 2_500)));
      expect(r.priceCents).toBe(2_750);
    });
  });

  describe('the leader raising their own max', () => {
    const state = item({
      currentPriceCents: 1_500,
      bidCount: 2,
      leaderBidderId: 'a',
      leaderMaxCents: 3_000,
    });

    it('raises the max without touching price, bids or the leader', () => {
      const r = accepted(resolveProxyBid(state, bid('a', 4_000, 'max', 3_000)));
      expect(r.outcome).toBe('max_raised');
      expect(r.priceCents).toBe(1_500);
      expect(r.leaderMaxCents).toBe(4_000);
      expect(r.leaderChanged).toBe(false);
      expect(r.bids).toEqual([]);
    });

    it('never lowers or repeats a max', () => {
      for (const amountCents of [3_000, 2_000]) {
        const r = resolveProxyBid(state, bid('a', amountCents, 'max', 3_000));
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.code).toBe('max_not_raised');
      }
    });
  });
});

describe('computeOrderAmounts', () => {
  it('matches hand-computed figures', () => {
    expect(
      computeOrderAmounts({ subtotalCents: 10_000, taxCents: 0, rate: 0.015 }),
    ).toEqual({
      platformFeeCents: 150,
      processingFeeCents: 334,
      taxCents: 0,
      totalCents: 10_484,
      applicationFeeCents: 484,
      recipientNetCents: 10_000,
    });
    expect(
      computeOrderAmounts({ subtotalCents: 10_000, taxCents: 700, rate: 0.03 }),
    ).toEqual({
      platformFeeCents: 300,
      processingFeeCents: 359,
      taxCents: 700,
      totalCents: 11_359,
      applicationFeeCents: 1_359,
      recipientNetCents: 10_000,
    });
  });

  const subtotals = [500, 2_500, 10_000, 123_456, 500_000, 2_500_000];
  const rates = [0.015, 0.03];

  it('non-profit nets exactly the subtotal; platform nets its fee + tax after Stripe', () => {
    for (const subtotalCents of subtotals) {
      for (const rate of rates) {
        for (const taxCents of [0, Math.round(subtotalCents * 0.0825)]) {
          const a = computeOrderAmounts({ subtotalCents, taxCents, rate });

          expect(a.recipientNetCents).toBe(subtotalCents);
          expect(a.totalCents).toBe(
            subtotalCents +
              a.taxCents +
              a.processingFeeCents +
              a.platformFeeCents,
          );
          expect(a.platformFeeCents).toBe(Math.round(subtotalCents * rate));
          expect(a.applicationFeeCents).toBe(
            a.platformFeeCents + a.processingFeeCents + a.taxCents,
          );

          const platformNet = a.applicationFeeCents - stripeBill(a.totalCents);
          expect(
            Math.abs(platformNet - (a.platformFeeCents + a.taxCents)),
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('charges more for a higher rate and for tax', () => {
    const base = computeOrderAmounts({
      subtotalCents: 50_000,
      taxCents: 0,
      rate: 0.015,
    });
    const highRate = computeOrderAmounts({
      subtotalCents: 50_000,
      taxCents: 0,
      rate: 0.03,
    });
    const taxed = computeOrderAmounts({
      subtotalCents: 50_000,
      taxCents: 4_000,
      rate: 0.015,
    });
    expect(highRate.totalCents).toBeGreaterThan(base.totalCents);
    expect(taxed.totalCents).toBeGreaterThan(base.totalCents);
  });

  it('allows a zero platform fee rate', () => {
    const a = computeOrderAmounts({
      subtotalCents: 10_000,
      taxCents: 0,
      rate: 0,
    });
    expect(a.platformFeeCents).toBe(0);
    expect(a.recipientNetCents).toBe(10_000);
  });

  it('rejects invalid inputs', () => {
    const ok = { subtotalCents: 1_000, taxCents: 0, rate: 0.015 };
    expect(() => computeOrderAmounts({ ...ok, subtotalCents: 0 })).toThrow(
      RangeError,
    );
    expect(() => computeOrderAmounts({ ...ok, subtotalCents: 10.5 })).toThrow(
      RangeError,
    );
    expect(() => computeOrderAmounts({ ...ok, taxCents: -1 })).toThrow(
      RangeError,
    );
    expect(() => computeOrderAmounts({ ...ok, rate: -0.01 })).toThrow(
      RangeError,
    );
    expect(() => computeOrderAmounts({ ...ok, rate: 0.5 })).toThrow(RangeError);
  });
});

describe('antiSnipeEndsAt', () => {
  const end = new Date('2026-11-01T20:00:00.000Z');
  const at = (seconds: number) => new Date(end.getTime() + seconds * 1000);
  const base = { endsAt: end, windowSeconds: 300, extensionSeconds: 300 };

  it('leaves the end alone outside the window', () => {
    expect(antiSnipeEndsAt({ ...base, now: at(-600) })).toBe(end);
  });

  it('extends to now + extension inside the window', () => {
    expect(antiSnipeEndsAt({ ...base, now: at(-100) })).toEqual(at(200));
  });

  it('does not move the end at the exact window edge', () => {
    expect(antiSnipeEndsAt({ ...base, now: at(-300) })).toEqual(end);
  });

  it('caps the extension at hard_close_at', () => {
    expect(
      antiSnipeEndsAt({ ...base, now: at(-10), hardCloseAt: at(100) }),
    ).toEqual(at(100));
  });

  it('never shortens the end when hard_close_at is earlier', () => {
    expect(
      antiSnipeEndsAt({ ...base, now: at(-10), hardCloseAt: at(-50) }),
    ).toBe(end);
  });

  it('ignores bids after the end and disabled extensions', () => {
    expect(antiSnipeEndsAt({ ...base, now: at(1) })).toBe(end);
    expect(
      antiSnipeEndsAt({ ...base, extensionSeconds: 0, now: at(-10) }),
    ).toBe(end);
  });

  it('keeps extending without a hard close', () => {
    expect(
      antiSnipeEndsAt({ ...base, now: at(-10), hardCloseAt: null }),
    ).toEqual(at(290));
  });

  it('stops at hard_close_at after repeated last-second bids', () => {
    const hardCloseAt = at(900);
    let current = end;
    for (let i = 0; i < 10; i += 1) {
      current = antiSnipeEndsAt({
        ...base,
        endsAt: current,
        now: new Date(current.getTime() - 5_000),
        hardCloseAt,
      });
    }
    expect(current).toEqual(hardCloseAt);
  });
});
