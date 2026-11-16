import { BadRequestException } from '@nestjs/common';
import { normalizePhone } from '../calls/phone';

export const PAY_TYPES = ['hourly', 'flat'] as const;
export type PayType = (typeof PAY_TYPES)[number];

export const SHIFT_STATUSES = [
  'scheduled',
  'clocked_in',
  'submitted',
  'approved',
  'paid',
  'cancelled',
] as const;
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

export const MAX_RATE = 100_000;
/** A shift longer than this is almost certainly a forgotten clock-out, so the manager must confirm the hours. */
export const LONG_SHIFT_MINUTES = 16 * 60;
export const MAX_APPROVED_MINUTES = 24 * 60;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** What a shift pays: rate x hours for hourly shifts, the flat fee otherwise. */
export function shiftAmount(
  payType: PayType,
  rate: number,
  minutes: number,
): number {
  if (payType === 'flat') return round2(rate);
  return round2((rate * minutes) / 60);
}

/** Whole minutes between clock-in and clock-out (never negative). */
export function minutesBetween(clockIn: string, clockOut: string): number {
  const ms = Date.parse(clockOut) - Date.parse(clockIn);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 60000)) : 0;
}

const dayMs = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/**
 * Shifts store a calendar date with no timezone, so allow clocking from the day before to the day
 * after the shift date. That covers every US timezone and shifts that run past midnight.
 */
export function withinClockWindow(shiftDate: string, nowMs: number): boolean {
  return (
    shiftDate >= isoDay(nowMs - dayMs) && shiftDate <= isoDay(nowMs + dayMs)
  );
}

const text = (v: unknown, field: string, max: number): string | undefined => {
  if (v === undefined) return undefined;
  if (v === null) return '';
  if (typeof v !== 'string')
    throw new BadRequestException(`${field} must be text.`);
  const t = v.trim();
  if (t.length > max)
    throw new BadRequestException(`${field} is too long (max ${max}).`);
  return t;
};

const payType = (v: unknown): PayType | undefined => {
  if (v === undefined) return undefined;
  if (!PAY_TYPES.includes(v as PayType))
    throw new BadRequestException('Pay type must be hourly or flat.');
  return v as PayType;
};

const rate = (v: unknown, field = 'Rate'): number | undefined => {
  if (v === undefined) return undefined;
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > MAX_RATE)
    throw new BadRequestException(
      `${field} must be a number between 0 and ${MAX_RATE}.`,
    );
  return round2(n);
};

const day = (v: unknown, field: string): string | undefined => {
  if (v === undefined) return undefined;
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v))
    throw new BadRequestException(`${field} must be a date (YYYY-MM-DD).`);
  if (Number.isNaN(Date.parse(`${v}T00:00:00Z`)))
    throw new BadRequestException(`${field} is not a real date.`);
  return v;
};

const clock = (v: unknown, field: string): string | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  if (typeof v !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v))
    throw new BadRequestException(`${field} must be a time (HH:MM).`);
  return v.slice(0, 5);
};

export interface MemberFields {
  name?: string;
  phone?: string;
  email?: string | null;
  job_title?: string | null;
  default_pay_type?: PayType;
  default_rate?: number;
  is_active?: boolean;
}

export function sanitizeMember(
  input: Record<string, unknown>,
  { creating }: { creating: boolean },
): MemberFields {
  const out: MemberFields = {};
  const name = text(input.name, 'Name', 120);
  if (creating && !name) throw new BadRequestException('Enter the name.');
  if (name !== undefined) {
    if (!name) throw new BadRequestException('Enter the name.');
    out.name = name;
  }
  if (input.phone !== undefined || creating) {
    const phone = normalizePhone(input.phone);
    if (!phone)
      throw new BadRequestException('Enter a valid mobile phone number.');
    out.phone = phone;
  }
  const email = text(input.email, 'Email', 200);
  if (email !== undefined) {
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      throw new BadRequestException('That email address does not look right.');
    out.email = email || null;
  }
  const title = text(input.job_title, 'Job title', 80);
  if (title !== undefined) out.job_title = title || null;
  const pt = payType(input.default_pay_type);
  if (pt) out.default_pay_type = pt;
  const dr = rate(input.default_rate, 'Default rate');
  if (dr !== undefined) out.default_rate = dr;
  if (input.is_active !== undefined) {
    if (typeof input.is_active !== 'boolean')
      throw new BadRequestException('is_active must be true or false.');
    out.is_active = input.is_active;
  }
  return out;
}

export interface ShiftFields {
  title?: string;
  event_id?: string | null;
  shift_date?: string;
  start_time?: string | null;
  end_time?: string | null;
  pay_type?: PayType;
  rate?: number;
  notes?: string | null;
}

export function sanitizeShift(
  input: Record<string, unknown>,
  { creating }: { creating: boolean },
): ShiftFields {
  const out: ShiftFields = {};
  const title = text(input.title, 'Title', 120);
  if (title !== undefined) {
    if (!title) throw new BadRequestException('Enter what the shift is for.');
    out.title = title;
  } else if (creating) {
    throw new BadRequestException('Enter what the shift is for.');
  }
  const date = day(input.shift_date, 'Shift date');
  if (date) out.shift_date = date;
  else if (creating) throw new BadRequestException('Choose the shift date.');
  const start = clock(input.start_time, 'Start time');
  if (start !== undefined) out.start_time = start;
  const end = clock(input.end_time, 'End time');
  if (end !== undefined) out.end_time = end;
  const pt = payType(input.pay_type);
  if (pt) out.pay_type = pt;
  const r = rate(input.rate);
  if (r !== undefined) out.rate = r;
  if (input.event_id !== undefined) {
    if (
      input.event_id !== null &&
      !(
        typeof input.event_id === 'string' &&
        /^[0-9a-f-]{36}$/i.test(input.event_id)
      )
    )
      throw new BadRequestException('Choose a valid event.');
    out.event_id = input.event_id ?? null;
  }
  const notes = text(input.notes, 'Notes', 500);
  if (notes !== undefined) out.notes = notes || null;
  return out;
}

/** Minutes a manager typed when approving; must be a whole, sane number. */
export function parseApprovedMinutes(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const n = typeof v === 'string' ? Number(v) : v;
  if (
    typeof n !== 'number' ||
    !Number.isInteger(n) ||
    n < 0 ||
    n > MAX_APPROVED_MINUTES
  )
    throw new BadRequestException(
      `Hours must be between 0 and ${MAX_APPROVED_MINUTES / 60}.`,
    );
  return n;
}

/** A spreadsheet runs text that starts with = + - @ as a formula, so defuse anything a person could type. */
export function csvCell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s) && !/^[+-]?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(
  header: string[],
  rows: (string | number | null | undefined)[][],
): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
}
