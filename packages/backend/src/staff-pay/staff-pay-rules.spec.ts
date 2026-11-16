import { BadRequestException } from '@nestjs/common';
import {
  csvCell,
  minutesBetween,
  parseApprovedMinutes,
  sanitizeMember,
  sanitizeShift,
  shiftAmount,
  toCsv,
  withinClockWindow,
} from './staff-pay-rules';

describe('shiftAmount', () => {
  it('pays rate x hours for hourly shifts, rounded to the cent', () => {
    expect(shiftAmount('hourly', 18.5, 270)).toBe(83.25);
    expect(shiftAmount('hourly', 20, 100)).toBe(33.33);
    expect(shiftAmount('hourly', 20, 0)).toBe(0);
  });
  it('pays the flat fee whatever the hours', () => {
    expect(shiftAmount('flat', 150, 0)).toBe(150);
    expect(shiftAmount('flat', 150, 900)).toBe(150);
  });
});

describe('minutesBetween', () => {
  it('counts whole minutes and never goes negative', () => {
    expect(minutesBetween('2026-11-14T18:00:00Z', '2026-11-14T23:30:20Z')).toBe(
      330,
    );
    expect(minutesBetween('2026-11-14T18:00:00Z', '2026-11-14T17:00:00Z')).toBe(
      0,
    );
    expect(minutesBetween('nope', '2026-11-14T17:00:00Z')).toBe(0);
  });
});

describe('withinClockWindow', () => {
  const now = Date.parse('2026-11-15T02:00:00Z'); // 8pm Central on Nov 14
  it('allows the day before, the day of and the day after', () => {
    expect(withinClockWindow('2026-11-14', now)).toBe(true);
    expect(withinClockWindow('2026-11-15', now)).toBe(true);
    expect(withinClockWindow('2026-11-16', now)).toBe(true);
  });
  it('refuses a shift days away', () => {
    expect(withinClockWindow('2026-11-12', now)).toBe(false);
    expect(withinClockWindow('2026-11-20', now)).toBe(false);
  });
});

describe('sanitizeMember', () => {
  it('normalises the phone and trims text', () => {
    expect(
      sanitizeMember(
        { name: '  Dee  ', phone: '(601) 555-0123', default_rate: '22.5' },
        { creating: true },
      ),
    ).toMatchObject({ name: 'Dee', phone: '+16015550123', default_rate: 22.5 });
  });
  it('needs a name and a real mobile number to create', () => {
    expect(() =>
      sanitizeMember({ phone: '6015550123' }, { creating: true }),
    ).toThrow('Enter the name');
    expect(() =>
      sanitizeMember({ name: 'A', phone: '123' }, { creating: true }),
    ).toThrow('valid mobile phone');
  });
  it('rejects bad pay types, negative rates and bad emails', () => {
    expect(() =>
      sanitizeMember({ default_pay_type: 'salary' }, { creating: false }),
    ).toThrow(BadRequestException);
    expect(() =>
      sanitizeMember({ default_rate: -1 }, { creating: false }),
    ).toThrow(BadRequestException);
    expect(() =>
      sanitizeMember({ email: 'nope' }, { creating: false }),
    ).toThrow('email');
  });
  it('only changes what was sent when updating', () => {
    expect(sanitizeMember({ is_active: false }, { creating: false })).toEqual({
      is_active: false,
    });
  });
});

describe('sanitizeShift', () => {
  it('requires a title and date to create', () => {
    expect(() =>
      sanitizeShift({ shift_date: '2026-12-01' }, { creating: true }),
    ).toThrow('what the shift is for');
    expect(() => sanitizeShift({ title: 'Bar' }, { creating: true })).toThrow(
      'shift date',
    );
  });
  it('validates dates, times and the event id', () => {
    expect(
      sanitizeShift(
        {
          title: 'Bar',
          shift_date: '2026-12-01',
          start_time: '17:30',
          rate: 20,
        },
        { creating: true },
      ),
    ).toMatchObject({ start_time: '17:30', rate: 20 });
    expect(() =>
      sanitizeShift(
        { title: 'Bar', shift_date: '2026-13-45' },
        { creating: true },
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      sanitizeShift(
        { title: 'B', shift_date: '2026-12-01', start_time: '25:00' },
        { creating: true },
      ),
    ).toThrow('time');
    expect(() =>
      sanitizeShift(
        { title: 'B', shift_date: '2026-12-01', event_id: 'x' },
        { creating: true },
      ),
    ).toThrow('valid event');
  });
});

describe('parseApprovedMinutes', () => {
  it('accepts whole minutes within a day and nothing else', () => {
    expect(parseApprovedMinutes(undefined)).toBeUndefined();
    expect(parseApprovedMinutes(300)).toBe(300);
    expect(parseApprovedMinutes('90')).toBe(90);
    expect(() => parseApprovedMinutes(-5)).toThrow(BadRequestException);
    expect(() => parseApprovedMinutes(1.5)).toThrow(BadRequestException);
    expect(() => parseApprovedMinutes(5000)).toThrow(BadRequestException);
  });
});

describe('CSV output', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  });
  it('defuses spreadsheet formulas but keeps numbers and phone numbers', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('@cmd')).toBe("'@cmd");
    expect(csvCell('-5.50')).toBe('-5.50');
    expect(csvCell('+16015550123')).toBe('+16015550123');
  });
  it('builds rows with a header', () => {
    expect(toCsv(['A', 'B'], [[1, 'x,y']])).toBe('A,B\r\n1,"x,y"');
  });
});
