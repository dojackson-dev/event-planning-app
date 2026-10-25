interface PickerEvent {
  id: string
  name: string
  date: string
  status?: string
}

export interface EventPickerGroups<T extends PickerEvent> {
  upcoming: T[]
  /** Expired events (most recent first), then cancelled ones. */
  past: T[]
}

const ymd = (value: string) => String(value || '').slice(0, 10)

export const localToday = (now = new Date()): string =>
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

/** Live events first (soonest first); cancelled and expired events go last so they don't bury the ones in play. */
export function groupEventsForPicker<T extends PickerEvent>(events: T[], today = localToday()): EventPickerGroups<T> {
  const cancelled = events.filter(e => e.status === 'cancelled')
  const rest = events.filter(e => e.status !== 'cancelled')
  const upcoming = rest
    .filter(e => ymd(e.date) >= today)
    .sort((a, b) => ymd(a.date).localeCompare(ymd(b.date)))
  const expired = rest
    .filter(e => ymd(e.date) < today)
    .sort((a, b) => ymd(b.date).localeCompare(ymd(a.date)))
  cancelled.sort((a, b) => ymd(b.date).localeCompare(ymd(a.date)))
  return { upcoming, past: [...expired, ...cancelled] }
}

export const eventPickerSuffix = (e: PickerEvent, today = localToday()): string =>
  e.status === 'cancelled' ? ' (cancelled)' : ymd(e.date) < today ? ' (past)' : ''
