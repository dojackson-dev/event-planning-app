/** Helpers for turning stored texts (sent and received) into per-person conversations. */

export interface StoredText {
  id: string;
  recipient_phone: string | null;
  recipient_name: string | null;
  content: string | null;
  message: string | null;
  status: string | null;
  read: boolean | null;
  created_at: string;
}

export interface ConversationSummary {
  phone: string;
  name: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastDirection: 'inbound' | 'outbound';
  unreadCount: number;
}

/** Replies from clients are stored with this status; everything else is a text we sent. */
export const RECEIVED_STATUS = 'received';

export const directionOf = (row: Pick<StoredText, 'status'>) =>
  row.status === RECEIVED_STATUS ? 'inbound' : 'outbound';

/** Last 10 digits, so +16012183374, 16012183374 and (601) 218-3374 are the same person. */
export function phoneKey(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '').slice(-10);
}

/** Every format this phone number might be stored in. */
export function phoneVariants(phone: string): string[] {
  const last10 = phoneKey(phone);
  if (last10.length < 10) return phone ? [phone] : [];
  return [...new Set([phone, last10, `1${last10}`, `+1${last10}`])];
}

/** Newest-first rows in, one summary per phone number out (newest conversation first). */
export function buildConversations(rows: StoredText[]): ConversationSummary[] {
  const byPerson = new Map<string, ConversationSummary>();
  for (const row of rows) {
    const key = phoneKey(row.recipient_phone);
    if (!key) continue;
    let thread = byPerson.get(key);
    if (!thread) {
      thread = {
        phone: row.recipient_phone as string,
        name: row.recipient_name,
        lastMessage: row.content ?? row.message ?? '',
        lastMessageAt: row.created_at,
        lastDirection: directionOf(row),
        unreadCount: 0,
      };
      byPerson.set(key, thread);
    }
    if (!thread.name && row.recipient_name) thread.name = row.recipient_name;
    if (directionOf(row) === 'inbound' && row.read !== true) {
      thread.unreadCount += 1;
    }
  }
  return [...byPerson.values()];
}
