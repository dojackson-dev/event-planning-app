import { earliestLiveEventDate } from './event-window';

describe('earliestLiveEventDate', () => {
  it('keeps tonight’s event live after the UTC date has rolled over (8pm Central, Nov 14)', () => {
    // 8pm CST on Nov 14 is 02:00 UTC on Nov 15
    expect(earliestLiveEventDate(Date.parse('2026-11-15T02:00:00Z'))).toBe(
      '2026-11-14',
    );
  });

  it('keeps an event running past midnight live until early the next morning', () => {
    // 1am CST on Nov 15 is 07:00 UTC; an event dated Nov 14 may still be going
    expect(earliestLiveEventDate(Date.parse('2026-11-15T07:00:00Z'))).toBe(
      '2026-11-14',
    );
  });

  it('drops the previous day once it is over in every US timezone', () => {
    // 14:00 UTC is 4am in Hawaii, the last US zone to finish the day
    expect(earliestLiveEventDate(Date.parse('2026-11-15T14:00:00Z'))).toBe(
      '2026-11-15',
    );
  });

  it('shows today’s event during the day', () => {
    expect(earliestLiveEventDate(Date.parse('2026-11-14T18:00:00Z'))).toBe(
      '2026-11-14',
    );
  });
});
