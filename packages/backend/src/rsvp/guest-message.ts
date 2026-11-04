import { BadRequestException } from '@nestjs/common';
import { emailKey, phoneKey } from './rsvp-duplicates';

export const GUEST_MESSAGE_MAX_LENGTH = 320;
export const MAX_RECIPIENTS = 300;
export const MAX_BROADCASTS_PER_DAY = 3;

export const AUDIENCES = ['attending', 'pending', 'declined', 'all'] as const;
export type Audience = (typeof AUDIENCES)[number];

export interface MessageGuest {
  id: string;
  guest_name: string;
  guest_phone?: string | null;
  guest_email?: string | null;
  status: string;
  sms_sent_at?: string | null;
  responded_at?: string | null;
}

export interface Recipient {
  guest: MessageGuest;
  sms: boolean;
  email: boolean;
}

export interface RecipientPlan {
  recipients: Recipient[];
  smsCount: number;
  emailCount: number;
  /** Guests in the group who cannot be reached (no contact details, never invited, or contact already covered). */
  skipped: number;
}

export function parseAudience(value: unknown): Audience {
  if (
    typeof value === 'string' &&
    (AUDIENCES as readonly string[]).includes(value)
  ) {
    return value as Audience;
  }
  throw new BadRequestException(
    'Choose who to message: attending, pending, declined or all.',
  );
}

/** Trims, strips control characters and enforces the length limit. */
export function cleanMessage(raw: unknown): string {
  const text = (typeof raw === 'string' ? raw : '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) throw new BadRequestException('Write a message to send.');
  if (text.length > GUEST_MESSAGE_MAX_LENGTH) {
    throw new BadRequestException(
      `Keep the message to ${GUEST_MESSAGE_MAX_LENGTH} characters or fewer (it is ${text.length}).`,
    );
  }
  return text;
}

/**
 * Who gets the message. A guest qualifies when they were invited or have answered, and has a phone or email.
 * Each phone number and email address is used once, so a couple sharing a phone is not texted twice
 * (they can still each get the email).
 */
export function planRecipients(
  guests: MessageGuest[],
  audience: Audience,
): RecipientPlan {
  const usedPhones = new Set<string>();
  const usedEmails = new Set<string>();
  const recipients: Recipient[] = [];
  let skipped = 0;

  for (const guest of guests) {
    if (audience !== 'all' && guest.status !== audience) continue;
    const reachableByUs = Boolean(guest.sms_sent_at || guest.responded_at);
    const phone = phoneKey(guest.guest_phone);
    const email = emailKey(guest.guest_email);
    const sms = reachableByUs && !!phone && !usedPhones.has(phone);
    const mail = reachableByUs && !!email && !usedEmails.has(email);
    if (!sms && !mail) {
      skipped++;
      continue;
    }
    if (sms && phone) usedPhones.add(phone);
    if (mail && email) usedEmails.add(email);
    recipients.push({ guest, sms, email: mail });
  }

  return {
    recipients,
    smsCount: recipients.filter((r) => r.sms).length,
    emailCount: recipients.filter((r) => r.email).length,
    skipped,
  };
}

export function buildSmsBody(
  senderName: string,
  eventName: string,
  message: string,
): string {
  return `${senderName} about ${eventName}: ${message}`;
}

/** Runs the work with at most `limit` calls in flight. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await work(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}
