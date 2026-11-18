import { BadRequestException } from '@nestjs/common';
import {
  fmtEventDate,
  fmtTime,
  sanitizeAssignmentDetails,
  sanitizeGuard,
  withinCheckInWindow,
} from './security-rules';

describe('sanitizeGuard', () => {
  it('trims the name and saves the phone in +1 format', () => {
    expect(
      sanitizeGuard({ name: '  Marcus Hill ', phone: '(601) 555-0123' }),
    ).toEqual({
      name: 'Marcus Hill',
      phone: '+16015550123',
    });
  });
  it('names the guard whose number is wrong', () => {
    expect(() => sanitizeGuard({ name: 'Marcus', phone: '123' })).toThrow(
      'valid mobile number for Marcus',
    );
    expect(() => sanitizeGuard({ name: '', phone: '6015550123' })).toThrow(
      BadRequestException,
    );
  });
});

describe('sanitizeAssignmentDetails', () => {
  it('accepts a report time, post and notes', () => {
    expect(
      sanitizeAssignmentDetails({
        report_time: '17:30',
        post: ' Front door ',
        notes: 'Check IDs',
      }),
    ).toEqual({
      report_time: '17:30',
      post: 'Front door',
      notes: 'Check IDs',
    });
  });
  it('treats blanks as none and rejects a bad time', () => {
    expect(sanitizeAssignmentDetails({ report_time: '', post: '' })).toEqual({
      report_time: null,
      post: null,
      notes: null,
    });
    expect(() => sanitizeAssignmentDetails({ report_time: '25:00' })).toThrow(
      'time',
    );
  });
});

describe('withinCheckInWindow', () => {
  const now = Date.parse('2026-11-21T02:00:00Z'); // 8pm Central on Nov 20
  it('allows the day before, the day of and the day after', () => {
    expect(withinCheckInWindow('2026-11-20', now)).toBe(true);
    expect(withinCheckInWindow('2026-11-21', now)).toBe(true);
    expect(withinCheckInWindow('2026-11-22', now)).toBe(true);
  });
  it('refuses an event days away', () => {
    expect(withinCheckInWindow('2026-11-10', now)).toBe(false);
    expect(withinCheckInWindow('2026-12-10', now)).toBe(false);
  });
});

describe('formatting', () => {
  it('formats times and dates for texts', () => {
    expect(fmtTime('17:30:00')).toBe('5:30 PM');
    expect(fmtTime(null)).toBe('');
    expect(fmtEventDate('2026-11-21')).toBe('Sat, Nov 21');
  });
});
