import { Colors } from '@/lib/theme';

// Shared helpers for the client-portal dashboard, events and notifications screens.

export const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding_reception: 'Wedding Reception',
  birthday_party: 'Birthday Party',
  retirement: 'Retirement',
  anniversary: 'Anniversary',
  baby_shower: 'Baby Shower',
  corporate_event: 'Corporate Event',
  fundraiser_gala: 'Fundraiser / Gala',
  concert_show: 'Concert / Show',
  conference_meeting: 'Conference / Meeting',
  quinceanera: 'Quinceañera',
  sweet_16: 'Sweet 16',
  prom_formal: 'Prom / Formal',
  family_reunion: 'Family Reunion',
  holiday_party: 'Holiday Party',
  engagement_party: 'Engagement Party',
  graduation_party: 'Graduation Party',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  draft: 'Draft',
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  scheduled: { bg: Colors.infoLight, fg: Colors.infoText },
  pending: { bg: Colors.warningLight, fg: Colors.warningText },
  confirmed: { bg: Colors.successLight, fg: Colors.successText },
  completed: { bg: Colors.primaryLight, fg: Colors.primaryText },
  cancelled: { bg: Colors.errorLight, fg: Colors.errorText },
  draft: { bg: Colors.borderLight, fg: Colors.textSecondary },
};

/** Read a field that may arrive as snake_case or camelCase. */
export function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v as T;
  }
  return undefined;
}

export function resolveEventStatus(event: any): string {
  const confirmation = pick<string>(event, 'client_confirmation_status', 'clientConfirmationStatus');
  const booking = event?.booking;
  if (confirmation === 'confirmed' || booking?.client_confirmation_status === 'confirmed') return 'confirmed';
  return String(booking?.status ?? event?.status ?? 'pending').toLowerCase();
}

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusColors(status: string): { bg: string; fg: string } {
  return STATUS_COLORS[status] ?? STATUS_COLORS.draft;
}

/** Maps a web link like `/client-portal/estimates/123` onto the mobile (client) route group. */
export function mapClientLink(link?: string | null): string | null {
  if (!link) return null;
  const m = /^\/client-portal\/([a-z-]+)(\/[^?#]*)?/.exec(link);
  if (!m) return null;
  const known = ['events', 'estimates', 'contracts', 'invoices', 'messages', 'vendors', 'items', 'rsvp', 'notifications'];
  if (!known.includes(m[1])) return null;
  return `/(client)/${m[1]}${m[2] ?? ''}`;
}
