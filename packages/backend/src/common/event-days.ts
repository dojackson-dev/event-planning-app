import { BadRequestException } from '@nestjs/common';

export interface DayEvent {
  event_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  state?: string | null;
  timezone?: string | null;
}

export interface ScanDay {
  date: string;
  index: number;
  total: number;
  multiDay: boolean;
}

const DEFAULT_TIMEZONE = 'America/Chicago';
const MAX_EVENT_DAYS = 31;
const DAY_MS = 86_400_000;

const EASTERN = 'America/New_York';
const CENTRAL = 'America/Chicago';
const MOUNTAIN = 'America/Denver';
const PACIFIC = 'America/Los_Angeles';

// Split states use the zone most of their population is in.
const STATE_TIMEZONE: Record<string, string> = {
  ...Object.fromEntries(
    'CT DE DC FL GA IN KY ME MD MA MI NH NJ NY NC OH PA RI SC VT VA WV'
      .split(' ')
      .map((s) => [s, EASTERN]),
  ),
  ...Object.fromEntries(
    'AL AR IL IA KS LA MN MS MO NE ND OK SD TN TX WI'
      .split(' ')
      .map((s) => [s, CENTRAL]),
  ),
  ...Object.fromEntries(
    'CO ID MT NM UT WY'.split(' ').map((s) => [s, MOUNTAIN]),
  ),
  ...Object.fromEntries('CA NV OR WA'.split(' ').map((s) => [s, PACIFIC])),
  AZ: 'America/Phoenix',
  AK: 'America/Anchorage',
  HI: 'Pacific/Honolulu',
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidTimezone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function timezoneForState(state?: string | null): string | null {
  const key = String(state ?? '')
    .trim()
    .toUpperCase();
  return STATE_TIMEZONE[key] ?? null;
}

/** The zone an event's days are counted in: the one saved on it, else its state's, else US Central. */
export function eventTimezone(ev: DayEvent): string {
  if (isValidTimezone(ev.timezone)) return ev.timezone;
  return timezoneForState(ev.state) ?? DEFAULT_TIMEZONE;
}

const day = (v: string | null | undefined) => (v ?? '').slice(0, 10);

export function isMultiDay(ev: DayEvent): boolean {
  const start = day(ev.event_date);
  const end = day(ev.end_date);
  return DATE_RE.test(start) && DATE_RE.test(end) && end > start;
}

const addDays = (isoDate: string, n: number) =>
  new Date(Date.parse(`${isoDate}T00:00:00Z`) + n * DAY_MS)
    .toISOString()
    .slice(0, 10);

/** Every date the event runs, first to last. A single-day event has one. */
export function eventDays(ev: DayEvent): string[] {
  const start = day(ev.event_date);
  if (!isMultiDay(ev)) return [start];
  const end = day(ev.end_date);
  const out: string[] = [];
  for (
    let d = start;
    d <= end && out.length < MAX_EVENT_DAYS;
    d = addDays(d, 1)
  )
    out.push(d);
  return out;
}

/** Rejects an end date that is not a real date, is before the start, or makes the event too long. */
export function assertValidDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  if (endDate === undefined || endDate === null || endDate === '') return;
  const start = day(startDate);
  const end = day(endDate);
  if (!DATE_RE.test(end) || Number.isNaN(Date.parse(`${end}T00:00:00Z`)))
    throw new BadRequestException('End date must be a date (YYYY-MM-DD).');
  if (DATE_RE.test(start) && end < start)
    throw new BadRequestException('End date cannot be before the start date.');
  const span =
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) /
      DAY_MS +
    1;
  if (DATE_RE.test(start) && span > MAX_EVENT_DAYS)
    throw new BadRequestException(
      `An event can run at most ${MAX_EVENT_DAYS} days.`,
    );
}

const toMinutes = (t?: string | null): number | null => {
  const m = /^(\d{2}):(\d{2})/.exec(String(t ?? ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

function localDateTime(tz: string, nowMs: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(nowMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

/**
 * Which day of the event the door is working right now, in the event's timezone. A show that runs past
 * midnight (it ends earlier in the day than it starts) still belongs to the night it opened until it ends.
 */
export function scanDay(ev: DayEvent, nowMs: number = Date.now()): ScanDay {
  const days = eventDays(ev);
  const multiDay = days.length > 1;
  const local = localDateTime(eventTimezone(ev), nowMs);
  const start = toMinutes(ev.start_time);
  const end = toMinutes(ev.end_time);
  const overnight = start !== null && end !== null && end < start;
  const date =
    overnight && local.minutes < end ? addDays(local.date, -1) : local.date;

  const index = days.indexOf(date);
  if (index === -1)
    throw new BadRequestException(
      `This event runs ${days[0]} to ${days[days.length - 1]}. Scanning and check-in are open on those dates.`,
    );
  return { date, index: index + 1, total: days.length, multiDay };
}
