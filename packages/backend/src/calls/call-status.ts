export type CallStatus =
  | 'initiated'
  | 'staff_ringing'
  | 'ringing'
  | 'client_ringing'
  | 'in_progress'
  | 'completed'
  | 'staff_declined'
  | 'staff_no_answer'
  | 'client_no_answer'
  | 'client_busy'
  | 'canceled'
  | 'failed'
  | 'voicemail';

const TERMINAL: CallStatus[] = [
  'completed',
  'staff_declined',
  'staff_no_answer',
  'client_no_answer',
  'client_busy',
  'canceled',
  'failed',
  'voicemail',
];

/** Statuses where the outbound call has not been bridged yet (one at a time per staff member). */
export const PRE_CONNECT_STATUSES: CallStatus[] = [
  'initiated',
  'staff_ringing',
  'client_ringing',
];

const RANK: Record<string, number> = {
  initiated: 0,
  staff_ringing: 1,
  ringing: 1,
  client_ringing: 2,
  in_progress: 3,
};

export function isTerminal(status: string): boolean {
  return TERMINAL.includes(status as CallStatus);
}

/**
 * Twilio callbacks can repeat or arrive out of order. A call only ever moves forward, and once it has
 * finished its status never changes.
 */
export function advanceStatus(current: string, next: CallStatus): CallStatus {
  if (isTerminal(current)) return current as CallStatus;
  if (isTerminal(next)) return next;
  return (RANK[next] ?? 0) >= (RANK[current] ?? 0)
    ? next
    : (current as CallStatus);
}

/** What the far end's Twilio call status means for the call record. */
export function clientLegStatus(twilioStatus: string): CallStatus | null {
  switch (twilioStatus) {
    case 'initiated':
    case 'ringing':
      return 'client_ringing';
    case 'in-progress':
    case 'answered':
      return 'in_progress';
    case 'completed':
      return 'completed';
    case 'busy':
      return 'client_busy';
    case 'no-answer':
    case 'canceled':
      return 'client_no_answer';
    case 'failed':
      return 'failed';
    default:
      return null;
  }
}

export const OUTCOMES = [
  'connected',
  'left_voicemail',
  'no_answer',
  'wrong_number',
  'call_back_later',
  'interested',
  'not_interested',
  'other',
] as const;
export type CallOutcome = (typeof OUTCOMES)[number];
