import {
  assertValidDateRange,
  eventDays,
  eventTimezone,
  isMultiDay,
  scanDay,
} from './event-days';

const fest = {
  event_date: '2026-07-10',
  end_date: '2026-07-12',
  start_time: '18:00',
  end_time: '23:00',
  state: 'MS',
};

// 2026-07-11 15:00 in Central (CDT, UTC-5) is 20:00 UTC.
const at = (iso: string) => Date.parse(iso);

describe('event days', () => {
  it('lists every date of a multi-day event', () => {
    expect(eventDays(fest)).toEqual(['2026-07-10', '2026-07-11', '2026-07-12']);
    expect(isMultiDay(fest)).toBe(true);
  });

  it('treats a missing or same-day end date as single-day', () => {
    expect(eventDays({ event_date: '2026-07-10' })).toEqual(['2026-07-10']);
    expect(
      isMultiDay({ event_date: '2026-07-10', end_date: '2026-07-10' }),
    ).toBe(false);
  });

  it('uses the saved timezone, then the state, then Central', () => {
    expect(eventTimezone({ ...fest, timezone: 'America/Denver' })).toBe(
      'America/Denver',
    );
    expect(eventTimezone({ ...fest, state: 'ca' })).toBe('America/Los_Angeles');
    expect(eventTimezone({ event_date: '2026-07-10' })).toBe('America/Chicago');
    expect(eventTimezone({ ...fest, timezone: 'Not/AZone' })).toBe(
      'America/Chicago',
    );
  });
});

describe('scanDay', () => {
  it('uses the event timezone, not UTC, to pick today', () => {
    // 02:00 UTC on the 12th is still 9 PM on the 11th in Mississippi.
    const day = scanDay(fest, at('2026-07-12T02:00:00Z'));
    expect(day).toEqual({
      date: '2026-07-11',
      index: 2,
      total: 3,
      multiDay: true,
    });
  });

  it('counts the first and last days', () => {
    expect(scanDay(fest, at('2026-07-10T23:00:00Z')).index).toBe(1);
    expect(scanDay(fest, at('2026-07-12T23:00:00Z')).index).toBe(3);
  });

  it('keeps an overnight show on the night it opened until it ends', () => {
    const late = { ...fest, start_time: '21:00', end_time: '03:00' };
    // 1 AM CDT on the 12th belongs to the 11th.
    expect(scanDay(late, at('2026-07-12T06:00:00Z')).date).toBe('2026-07-11');
    // 4 AM CDT on the 12th is the new day.
    expect(scanDay(late, at('2026-07-12T09:00:00Z')).date).toBe('2026-07-12');
  });

  it('refuses dates outside the run', () => {
    expect(() => scanDay(fest, at('2026-07-09T20:00:00Z'))).toThrow(
      'runs 2026-07-10 to 2026-07-12',
    );
    expect(() => scanDay(fest, at('2026-07-13T20:00:00Z'))).toThrow(
      'runs 2026-07-10 to 2026-07-12',
    );
  });
});

describe('assertValidDateRange', () => {
  it('allows no end date and a later end date', () => {
    expect(() => assertValidDateRange('2026-07-10', undefined)).not.toThrow();
    expect(() =>
      assertValidDateRange('2026-07-10', '2026-07-12'),
    ).not.toThrow();
  });

  it('rejects an end date before the start, a bad date, or a very long run', () => {
    expect(() => assertValidDateRange('2026-07-10', '2026-07-09')).toThrow(
      'before the start',
    );
    expect(() => assertValidDateRange('2026-07-10', 'soon')).toThrow(
      'End date must be a date',
    );
    expect(() => assertValidDateRange('2026-07-10', '2026-09-30')).toThrow(
      'at most',
    );
  });
});
