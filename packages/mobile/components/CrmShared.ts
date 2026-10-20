import { Colors } from '@/lib/theme';

// Shapes returned by the backend REST API (same endpoints the web app uses).

export interface IntakeForm {
  id: string;
  event_type?: string | null;
  event_name?: string | null;
  event_date?: string | null;
  event_time?: string | null;
  event_end_time?: string | null;
  guest_count?: number | null;
  contact_name: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  budget_range?: string | null;
  status: string;
  display_status?: string | null;
  created_at?: string | null;
  event_id?: string | null;
}

export interface CrmInvoice {
  id: string;
  status?: string;
  total_amount?: number | string | null;
  amount_due?: number | string | null;
  amount_paid?: number | string | null;
  amountDue?: number | string | null;
  amountPaid?: number | string | null;
  event_id?: string | null;
  booking_id?: string | null;
  intake_form_id?: string | null;
}

// GET /bookings returns raw event rows (only deposit_paid / completed).
export interface CrmBooking {
  id: string;
  name?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  venue?: string | null;
  guest_count?: number | null;
  status?: string | null;
  client_status?: string | null;
  clientStatus?: string | null;
  client_confirmation_status?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  total_amount?: number | string | null;
  deposit_amount?: number | string | null;
  totalPrice?: number | string | null;
  totalAmountPaid?: number | string | null;
  created_at?: string | null;
  createdAt?: string | null;
  intake_form_id?: string | null;
  intake_form?: {
    contact_name?: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    event_name?: string | null;
    event_type?: string | null;
  } | null;
  event?: { name?: string | null; date?: string | null; maxGuests?: number | null } | null;
  user?: { firstName?: string; lastName?: string } | null;
}

export const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export const money = (n: number): string =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const parseLocalDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value?: string | null): string => {
  const d = parseLocalDate(value);
  return d
    ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Date TBD';
};

export const formatTime = (value?: string | null): string => {
  if (!value) return '';
  const [h, m] = value.split(':');
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return value;
  return `${hour % 12 || 12}:${(m ?? '00').slice(0, 2)} ${hour >= 12 ? 'PM' : 'AM'}`;
};

export const titleCase = (s?: string | null): string =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ') : '';

export const formatEventType = (type?: string | null): string => {
  if (!type) return '';
  if (type === 'corporate') return 'Corporate Event';
  return titleCase(type);
};

type Tone = { bg: string; text: string; stripe: string };

const TONES = {
  blue: { bg: Colors.infoLight, text: Colors.infoText, stripe: Colors.info },
  yellow: { bg: Colors.warningLight, text: Colors.warningText, stripe: Colors.warning },
  green: { bg: Colors.successLight, text: Colors.successText, stripe: Colors.success },
  purple: { bg: Colors.purpleLight, text: Colors.purpleText, stripe: Colors.purple },
  gray: { bg: Colors.borderLight, text: Colors.textSecondary, stripe: Colors.textMuted },
  red: { bg: Colors.errorLight, text: Colors.errorText, stripe: Colors.error },
} satisfies Record<string, Tone>;

// Same mapping as the web clients page (getStatusColor + status stripe).
export const leadTone = (status: string): Tone => {
  switch (status) {
    case 'new': return TONES.blue;
    case 'contacted': return TONES.yellow;
    case 'converted':
    case 'active': return TONES.green;
    case 'booked': return TONES.purple;
    case 'completed': return TONES.gray;
    case 'cancelled': return TONES.red;
    default: return TONES.gray;
  }
};

export const leadStatus = (c: Pick<IntakeForm, 'status' | 'display_status'>): string =>
  c.display_status ?? c.status;

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  contacted_by_phone: 'Contacted',
  walkthrough_completed: 'Walkthrough Done',
  booked: 'Booked',
  deposit_paid: 'Deposit Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const CLIENT_STATUS_TONES: Record<string, Tone> = {
  contacted_by_phone: TONES.gray,
  walkthrough_completed: TONES.blue,
  booked: TONES.yellow,
  deposit_paid: TONES.purple,
  completed: TONES.green,
  cancelled: TONES.red,
};

export const bookingClientStatus = (b: CrmBooking): string => {
  if (b.status === 'cancelled') return 'cancelled';
  return b.client_status ?? b.clientStatus ?? 'booked';
};

export const bookingClientName = (b: CrmBooking): string =>
  b.contact_name ||
  b.intake_form?.contact_name ||
  (b.user ? `${b.user.firstName ?? ''} ${b.user.lastName ?? ''}`.trim() : '') ||
  'Client';

export const bookingEventName = (b: CrmBooking): string =>
  b.name || b.event?.name || b.intake_form?.event_name || 'Event';

export const bookingDate = (b: CrmBooking): string | null => b.date ?? b.event?.date ?? null;

// Sum invoices tied to this booking (by event/booking/intake form). Falls back
// to the totals stored on the booking row when no invoice is linked.
export const bookingMoney = (b: CrmBooking, invoices: CrmInvoice[]) => {
  const linked = invoices.filter(
    (i) =>
      i.status !== 'cancelled' &&
      (i.event_id === b.id ||
        i.booking_id === b.id ||
        (!!b.intake_form_id && i.intake_form_id === b.intake_form_id)),
  );
  if (linked.length > 0) {
    const total = linked.reduce((s, i) => s + num(i.total_amount), 0);
    const paid = linked.reduce((s, i) => s + num(i.amount_paid ?? i.amountPaid), 0);
    const due = linked.reduce((s, i) => s + num(i.amount_due ?? i.amountDue), 0);
    return { total, paid, due: Math.max(due, 0) };
  }
  const total = num(b.total_amount ?? b.totalPrice);
  const paid = num(b.totalAmountPaid);
  return { total, paid, due: Math.max(total - paid, 0) };
};

export const errorMessage = (e: unknown, fallback: string): string =>
  e instanceof Error && e.message ? e.message : fallback;
