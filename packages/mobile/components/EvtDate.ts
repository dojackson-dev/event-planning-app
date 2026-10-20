// Shared date/time/event helpers for the events & scheduling screens.

/** Parse 'YYYY-MM-DD' (or an ISO string starting with it) as a LOCAL date — avoids the UTC off-by-one. */
export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayKey(): string {
  return toDateKey(new Date());
}

export function formatDate(
  value?: string | null,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
): string {
  const d = parseLocalDate(value);
  return d ? d.toLocaleDateString('en-US', opts) : '';
}

export function formatTime(t?: string | null): string {
  if (!t) return '';
  const [h, m] = String(t).split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return '';
  return `${hour % 12 || 12}:${(m || '00').slice(0, 2)} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function formatTimeRange(start?: string | null, end?: string | null): string {
  return [formatTime(start), formatTime(end)].filter(Boolean).join(' – ');
}

export const isValidDateInput = (v: string) => !!parseLocalDate(v) && /^\d{4}-\d{2}-\d{2}$/.test(v);
export const isValidTimeInput = (v: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(v);

export function titleCase(value?: string | null): string {
  return value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '';
}

export function formatCurrency(n?: number | string | null): string {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (Number.isNaN(num)) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(num);
}

/** Backend GET /events returns camelCase plus flattened intake fields; be tolerant of snake_case too. */
export interface EvtEvent {
  id: string;
  name: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  venue?: string | null;
  venueId?: string | null;
  location?: string | null;
  status?: string | null;
  maxGuests?: number | null;
  description?: string | null;
  budget?: number | null;
  notes?: string | null;
  specialRequirements?: string | null;
  intakeFormId?: string | null;
  intakeEventName?: string | null;
  intakeFormStatus?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  budgetRange?: string | null;
  guestCount?: number | null;
  bookingId?: string | null;
  clientStatus?: string | null;
}

export function normalizeEvent(raw: any): EvtEvent {
  return {
    ...raw,
    id: String(raw.id),
    name: raw.name ?? '',
    date: raw.date ?? '',
    startTime: raw.startTime ?? raw.start_time ?? null,
    endTime: raw.endTime ?? raw.end_time ?? null,
    venueId: raw.venueId ?? raw.venue_id ?? null,
    maxGuests: raw.maxGuests ?? raw.guest_count ?? null,
    intakeFormId: raw.intakeFormId ?? raw.intake_form_id ?? null,
    intakeEventName: raw.intakeEventName ?? raw.intake_form?.event_name ?? null,
    intakeFormStatus: raw.intakeFormStatus ?? raw.intake_form?.status ?? null,
    clientName: raw.clientName ?? raw.intake_form?.contact_name ?? null,
    clientEmail: raw.clientEmail ?? raw.intake_form?.contact_email ?? null,
    clientPhone: raw.clientPhone ?? raw.intake_form?.contact_phone ?? null,
    specialRequirements: raw.specialRequirements ?? raw.special_requirements ?? null,
    bookingId: raw.bookingId ?? raw.booking_id ?? null,
    clientStatus: raw.clientStatus ?? raw.client_status ?? null,
  };
}

export const eventTitle = (e: Pick<EvtEvent, 'name' | 'intakeEventName'>) =>
  e.intakeEventName || e.name || 'Untitled Event';

export interface EvtProgressStep {
  label: string;
  done: boolean;
  skipped?: boolean;
}

/** Mirrors the 5-step booking progress used by the web events list / manage page. */
export function computeProgress(
  event: EvtEvent & { managementData?: any },
  estimates: any[],
  invoices: any[],
  contracts: any[],
): EvtProgressStep[] {
  const mgmt = event.managementData ?? {};
  const eId = event.id;
  const ifId = event.intakeFormId || undefined;

  const estimateAccepted = estimates.some(
    (e) =>
      ['approved', 'converted'].includes(e.status) &&
      (e.event_id === eId || e.booking?.event_id === eId || (ifId && e.intake_form_id === ifId)),
  );
  const eventContracts = contracts.filter((c) => c.event_id === eId || (ifId && c.intake_form_id === ifId));
  const hasActiveContract = eventContracts.some((c) => c.status !== 'voided');
  const contractSigned = mgmt.contractStatus === 'signed' || eventContracts.some((c) => c.status === 'signed');
  const contractSkipped = !hasActiveContract && !contractSigned;
  const activated = !event.intakeFormId || ['converted', 'confirmed', 'accepted'].includes(event.intakeFormStatus || '');
  const invoicePaid = invoices.some(
    (i) => i.status === 'paid' && (i.event_id === eId || (ifId && i.intake_form_id === ifId)),
  );

  return [
    { label: 'Activate', done: activated },
    { label: 'Estimate', done: estimateAccepted },
    { label: 'Contract', done: contractSigned, skipped: contractSkipped },
    { label: 'Invoice', done: invoicePaid },
    { label: 'Booked', done: invoicePaid },
  ];
}
