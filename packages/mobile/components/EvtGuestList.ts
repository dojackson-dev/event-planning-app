export const EVT_FRONTEND_URL = 'https://eventecos.com';

export interface EvtGuest {
  id: number;
  name: string;
  phone?: string | null;
  plusOnes: number;
  hasArrived: boolean;
  arrivedAt?: string | null;
  isVip: boolean;
}

export interface EvtGuestList {
  id: number;
  eventId: string;
  event: { id?: string; name?: string; date?: string; startTime?: string | null } | null;
  guests: EvtGuest[];
  accessCode: string;
  shareToken: string;
  arrivalToken: string;
  isLocked: boolean;
  maxGuestsPerPerson: number;
}

/** Backend returns snake_case rows; accept camelCase as well. */
export function normalizeGuest(g: any): EvtGuest {
  return {
    id: g.id,
    name: g.name ?? '',
    phone: g.phone ?? null,
    plusOnes: g.plus_one_count ?? g.plusOneCount ?? 0,
    hasArrived: !!(g.has_arrived ?? g.hasArrived),
    arrivedAt: g.arrived_at ?? g.arrivedAt ?? null,
    isVip: !!(g.is_vip ?? g.isVip),
  };
}

export function normalizeGuestList(gl: any): EvtGuestList {
  const ev = gl.event || null;
  return {
    id: gl.id,
    eventId: String(gl.event_id ?? gl.eventId ?? ''),
    event: ev ? { id: ev.id, name: ev.name, date: ev.date, startTime: ev.start_time ?? ev.startTime ?? null } : null,
    guests: (gl.guests || []).map(normalizeGuest),
    accessCode: gl.access_code ?? gl.accessCode ?? '',
    shareToken: gl.share_token ?? gl.shareToken ?? '',
    arrivalToken: gl.arrival_token ?? gl.arrivalToken ?? '',
    isLocked: !!(gl.is_locked ?? gl.isLocked),
    maxGuestsPerPerson: gl.max_guests_per_person ?? gl.maxGuestsPerPerson ?? 0,
  };
}

export const guestListShareMessage = (gl: Pick<EvtGuestList, 'shareToken' | 'accessCode'>) =>
  `You've been invited to view and edit the guest list!\n\nLink: ${EVT_FRONTEND_URL}/guest-list/share/${gl.shareToken}\nAccess Code: ${gl.accessCode}\n\nOpen the link and enter the code to get started.`;

export const doorLinkMessage = (gl: Pick<EvtGuestList, 'arrivalToken'>) =>
  `Door list arrival tracking:\n${EVT_FRONTEND_URL}/guest-list/arrival/${gl.arrivalToken}`;
