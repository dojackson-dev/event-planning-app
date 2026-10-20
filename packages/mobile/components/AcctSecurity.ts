// Shared shape helpers for security personnel rows. The backend returns raw
// snake_case rows (with a joined `event`), so accept both casings.
export interface SecurityRow {
  id: string;
  name?: string | null;
  officer_name?: string | null;
  phone?: string | null;
  event_id?: string | null;
  eventId?: string | null;
  arrival_time?: string | null;
  arrivalTime?: string | null;
  event?: {
    id?: string;
    name?: string | null;
    date?: string | null;
    start_time?: string | null;
    startTime?: string | null;
  } | null;
}

export const secName = (s: SecurityRow) => s.name || s.officer_name || 'Security personnel';
export const secEventId = (s: SecurityRow) => s.event_id ?? s.eventId ?? s.event?.id ?? '';
export const secArrival = (s: SecurityRow) => s.arrival_time ?? s.arrivalTime ?? null;
export const secEventStart = (s: SecurityRow) => s.event?.start_time ?? s.event?.startTime ?? null;
export const secLocalDate = (d: string) => new Date(d.length === 10 ? `${d}T00:00:00` : d);
