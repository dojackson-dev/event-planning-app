import { advanceStatus, clientLegStatus, isTerminal } from './call-status';
import {
  DEFAULT_BUSINESS_HOURS,
  isOpenNow,
  parseBusinessHours,
} from './business-hours';
import { isAllowedDestination, maskNumber, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it('accepts common US formats and returns E.164', () => {
    expect(normalizePhone('(601) 218-3374')).toBe('+16012183374');
    expect(normalizePhone('601-218-3374')).toBe('+16012183374');
    expect(normalizePhone('1 601 218 3374')).toBe('+16012183374');
    expect(normalizePhone('+16012183374')).toBe('+16012183374');
  });

  it('rejects things that cannot be dialled', () => {
    expect(normalizePhone('')).toBeNull();
    expect(normalizePhone('12345')).toBeNull();
    expect(normalizePhone('(011) 218-3374')).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('+1601218337')).toBeNull();
  });

  it('keeps other countries when written with a +', () => {
    expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
  });
});

describe('isAllowedDestination', () => {
  it('follows the configured country codes', () => {
    expect(isAllowedDestination('+16012183374', ['+1'])).toBe(true);
    expect(isAllowedDestination('+442079460958', ['+1'])).toBe(false);
    expect(isAllowedDestination('+442079460958', ['+1', '+44'])).toBe(true);
  });

  it('never allows premium-rate numbers', () => {
    expect(isAllowedDestination('+19005551234', ['+1'])).toBe(false);
    expect(isAllowedDestination('+19765551234', ['+1'])).toBe(false);
  });

  it('masks numbers for display', () => {
    expect(maskNumber('+16012183374')).toBe('•••• 3374');
    expect(maskNumber(null)).toBeNull();
  });
});

describe('call status', () => {
  it('only moves forward', () => {
    expect(advanceStatus('initiated', 'staff_ringing')).toBe('staff_ringing');
    expect(advanceStatus('in_progress', 'client_ringing')).toBe('in_progress');
    expect(advanceStatus('client_ringing', 'in_progress')).toBe('in_progress');
  });

  it('never changes once a call has finished, so repeated or late callbacks are harmless', () => {
    expect(advanceStatus('completed', 'in_progress')).toBe('completed');
    expect(advanceStatus('staff_no_answer', 'completed')).toBe(
      'staff_no_answer',
    );
    expect(advanceStatus('failed', 'staff_ringing')).toBe('failed');
  });

  it('lets a live call finish', () => {
    expect(advanceStatus('in_progress', 'completed')).toBe('completed');
    expect(advanceStatus('client_ringing', 'client_no_answer')).toBe(
      'client_no_answer',
    );
    expect(isTerminal('voicemail')).toBe(true);
    expect(isTerminal('ringing')).toBe(false);
  });

  it('maps the far-end Twilio statuses', () => {
    expect(clientLegStatus('in-progress')).toBe('in_progress');
    expect(clientLegStatus('busy')).toBe('client_busy');
    expect(clientLegStatus('no-answer')).toBe('client_no_answer');
    expect(clientLegStatus('failed')).toBe('failed');
    expect(clientLegStatus('mystery')).toBeNull();
  });
});

describe('business hours', () => {
  // 2026-11-04 is a Wednesday. Central time is UTC-6 in November.
  it('is open on weekday working hours in the configured time zone', () => {
    expect(
      isOpenNow(new Date('2026-11-04T16:00:00Z'), DEFAULT_BUSINESS_HOURS),
    ).toBe(true); // 10:00 CST
  });

  it('is closed at night, before opening and at closing time', () => {
    expect(
      isOpenNow(new Date('2026-11-05T03:00:00Z'), DEFAULT_BUSINESS_HOURS),
    ).toBe(false); // Wed 9pm CST
    expect(
      isOpenNow(new Date('2026-11-04T14:59:00Z'), DEFAULT_BUSINESS_HOURS),
    ).toBe(false); // 8:59 CST
    expect(
      isOpenNow(new Date('2026-11-04T23:00:00Z'), DEFAULT_BUSINESS_HOURS),
    ).toBe(false); // 17:00 CST
  });

  it('is closed on weekends', () => {
    expect(
      isOpenNow(new Date('2026-11-07T17:00:00Z'), DEFAULT_BUSINESS_HOURS),
    ).toBe(false); // Saturday noon
  });

  it('validates what an admin saves', () => {
    expect(() =>
      parseBusinessHours({ timezone: 'Nowhere/City', days: {} }),
    ).toThrow('Time zone');
    expect(() =>
      parseBusinessHours({
        timezone: 'America/Chicago',
        days: { mon: { open: '17:00', close: '09:00' } },
      }),
    ).toThrow('mon');
    const ok = parseBusinessHours({
      timezone: 'America/Chicago',
      days: { mon: { open: '08:00', close: '12:00' } },
    });
    expect(ok.days.mon).toEqual({ open: '08:00', close: '12:00' });
    expect(ok.days.tue).toBeNull();
  });
});
