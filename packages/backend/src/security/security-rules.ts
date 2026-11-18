import { BadRequestException } from '@nestjs/common';
import { normalizePhone } from '../calls/phone';

export const MAX_GUARDS_PER_REQUEST = 30;

const clean = (v: unknown, field: string, max: number): string | null => {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'string')
    throw new BadRequestException(`${field} must be text.`);
  const t = v.trim();
  if (t.length > max)
    throw new BadRequestException(`${field} is too long (max ${max}).`);
  return t || null;
};

export interface NewGuard {
  name: string;
  phone: string;
}

/** A guard typed in by hand: needs a name and a real mobile number, saved in the standard +1 format. */
export function sanitizeGuard(input: Record<string, unknown>): NewGuard {
  const name = clean(input?.name, 'Name', 120);
  if (!name) throw new BadRequestException('Enter each guard\u2019s name.');
  const phone = normalizePhone(input?.phone);
  if (!phone)
    throw new BadRequestException(`Enter a valid mobile number for ${name}.`);
  return { name, phone };
}

export interface AssignmentDetails {
  report_time: string | null;
  post: string | null;
  notes: string | null;
}

/** What every guard in one request shares: when to report, where to stand, and any notes. */
export function sanitizeAssignmentDetails(
  input: Record<string, unknown>,
): AssignmentDetails {
  const t = input?.report_time;
  let report_time: string | null = null;
  if (t !== undefined && t !== null && t !== '') {
    if (
      typeof t !== 'string' ||
      !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(t)
    )
      throw new BadRequestException('Report time must be a time (HH:MM).');
    report_time = t.slice(0, 5);
  }
  return {
    report_time,
    post: clean(input?.post, 'Post', 120),
    notes: clean(input?.notes, 'Notes', 500),
  };
}

const dayMs = 86_400_000;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Guards may check in from the day before to the day after the event, which covers every US timezone. */
export function withinCheckInWindow(eventDate: string, nowMs: number): boolean {
  const d = String(eventDate).slice(0, 10);
  return d >= isoDay(nowMs - dayMs) && d <= isoDay(nowMs + dayMs);
}

export const fmtTime = (t?: string | null): string => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const fmtEventDate = (d?: string | null): string =>
  d
    ? new Date(`${String(d).slice(0, 10)}T12:00:00Z`).toLocaleDateString(
        'en-US',
        { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' },
      )
    : '';
