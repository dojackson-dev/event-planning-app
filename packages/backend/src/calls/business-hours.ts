export const DAY_KEYS = [
  'sun',
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
] as const;
export type DayKey = (typeof DAY_KEYS)[number];

/** "HH:MM" 24h, or null when closed that day. */
export type DayHours = { open: string; close: string } | null;

export interface BusinessHours {
  timezone: string;
  days: Record<DayKey, DayHours>;
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  timezone: 'America/Chicago',
  days: {
    sun: null,
    mon: { open: '09:00', close: '17:00' },
    tue: { open: '09:00', close: '17:00' },
    wed: { open: '09:00', close: '17:00' },
    thu: { open: '09:00', close: '17:00' },
    fri: { open: '09:00', close: '17:00' },
    sat: null,
  },
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Returns a cleaned copy, or throws with a message for the admin. */
export function parseBusinessHours(input: unknown): BusinessHours {
  const value = input as Partial<BusinessHours> | null;
  if (!value || typeof value !== 'object' || typeof value.days !== 'object') {
    throw new Error('Business hours are not valid.');
  }
  const timezone = String(value.timezone ?? '');
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone });
  } catch {
    throw new Error('Time zone is not valid.');
  }
  const days = {} as Record<DayKey, DayHours>;
  for (const key of DAY_KEYS) {
    const day = (value.days as Record<string, DayHours | undefined>)[key];
    if (!day) {
      days[key] = null;
      continue;
    }
    if (
      !HHMM.test(day.open) ||
      !HHMM.test(day.close) ||
      day.open >= day.close
    ) {
      throw new Error(`Hours for ${key} are not valid.`);
    }
    days[key] = { open: day.open, close: day.close };
  }
  return { timezone, days };
}

export function isOpenNow(now: Date, hours: BusinessHours): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: hours.timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day =
    DAY_KEYS[
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
    ];
  const today = day ? hours.days[day] : null;
  if (!today) return false;
  const time = `${get('hour')}:${get('minute')}`;
  return time >= today.open && time < today.close;
}
