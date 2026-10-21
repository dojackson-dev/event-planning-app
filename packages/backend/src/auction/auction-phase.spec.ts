import { computeAuctionPhase, isPubliclyVisible } from './auction-phase';

const NOW = new Date('2026-06-01T12:00:00Z');
const past = '2026-05-01T00:00:00Z';
const future = '2026-07-01T00:00:00Z';

describe('computeAuctionPhase', () => {
  it.each(['closed', 'settled', 'cancelled'])(
    '%s is always closed, even if donations are still flagged on',
    (status) => {
      expect(
        computeAuctionPhase(
          { status, accepts_donations: true, hasVisibleItems: true },
          NOW,
        ),
      ).toBe('closed');
    },
  );

  it('live means bidding_open regardless of the donation window', () => {
    expect(
      computeAuctionPhase(
        { status: 'live', accepts_donations: true, hasVisibleItems: false },
        NOW,
      ),
    ).toBe('bidding_open');
  });

  it.each(['draft', 'scheduled'])(
    '%s accepts donations with no close time',
    (status) => {
      expect(
        computeAuctionPhase(
          { status, accepts_donations: true, hasVisibleItems: true },
          NOW,
        ),
      ).toBe('accepting_donations');
    },
  );

  it('accepts donations until donations_close_at, then previews', () => {
    const base = {
      status: 'scheduled',
      accepts_donations: true,
      hasVisibleItems: true,
    };
    expect(
      computeAuctionPhase({ ...base, donations_close_at: future }, NOW),
    ).toBe('accepting_donations');
    expect(
      computeAuctionPhase({ ...base, donations_close_at: past }, NOW),
    ).toBe('preview');
    expect(
      computeAuctionPhase(
        { ...base, donations_close_at: NOW.toISOString() },
        NOW,
      ),
    ).toBe('preview');
  });

  it('previews when donations are off and items exist, otherwise upcoming', () => {
    expect(
      computeAuctionPhase(
        { status: 'draft', accepts_donations: false, hasVisibleItems: true },
        NOW,
      ),
    ).toBe('preview');
    expect(
      computeAuctionPhase(
        { status: 'draft', accepts_donations: false, hasVisibleItems: false },
        NOW,
      ),
    ).toBe('upcoming');
    expect(
      computeAuctionPhase({ status: 'scheduled', hasVisibleItems: false }, NOW),
    ).toBe('upcoming');
  });

  it('uses the current time by default', () => {
    expect(
      computeAuctionPhase({
        status: 'draft',
        accepts_donations: true,
        donations_close_at: '2000-01-01T00:00:00Z',
        hasVisibleItems: false,
      }),
    ).toBe('upcoming');
  });
});

describe('isPubliclyVisible', () => {
  it.each(['scheduled', 'live', 'closed', 'settled'])(
    '%s is visible without the page flag',
    (status) => {
      expect(isPubliclyVisible({ status })).toBe(true);
    },
  );

  it('a draft is visible only with page_published', () => {
    expect(isPubliclyVisible({ status: 'draft' })).toBe(false);
    expect(isPubliclyVisible({ status: 'draft', page_published: false })).toBe(
      false,
    );
    expect(isPubliclyVisible({ status: 'draft', page_published: true })).toBe(
      true,
    );
  });

  it('a cancelled auction is never visible', () => {
    expect(
      isPubliclyVisible({ status: 'cancelled', page_published: true }),
    ).toBe(false);
  });
});
