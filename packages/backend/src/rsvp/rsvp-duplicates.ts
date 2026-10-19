export interface GuestContact {
  id?: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
}

export type DuplicateReason = 'phone' | 'email' | 'name';

/** Last 10 digits so "(404) 555-0123", "404-555-0123" and "+1 404 555 0123" compare equal. */
export function phoneKey(phone?: string | null): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  return digits.length >= 7 ? digits.slice(-10) : null;
}

export function emailKey(email?: string | null): string | null {
  const value = (email ?? '').trim().toLowerCase();
  return value.includes('@') ? value : null;
}

export function nameKey(name?: string | null): string {
  return (name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Same phone or same email: the invite would reach the same person. */
export function sharedContact(
  a: GuestContact,
  b: GuestContact,
): 'phone' | 'email' | null {
  const ap = phoneKey(a.guest_phone);
  if (ap && ap === phoneKey(b.guest_phone)) return 'phone';
  const ae = emailKey(a.guest_email);
  if (ae && ae === emailKey(b.guest_email)) return 'email';
  return null;
}

function hasContact(guest: GuestContact): boolean {
  return Boolean(phoneKey(guest.guest_phone) || emailKey(guest.guest_email));
}

/**
 * A guest is a duplicate when it shares a phone or email with an existing one,
 * or has the same name and at least one of the two has no contact details to tell them apart.
 */
export function findDuplicateGuest<T extends GuestContact>(
  candidate: GuestContact,
  existing: T[],
): { match: T; reason: DuplicateReason } | null {
  for (const guest of existing) {
    const reason = sharedContact(candidate, guest);
    if (reason) return { match: guest, reason };
  }
  const name = nameKey(candidate.guest_name);
  if (!name) return null;
  for (const guest of existing) {
    if (
      nameKey(guest.guest_name) === name &&
      (!hasContact(candidate) || !hasContact(guest))
    ) {
      return { match: guest, reason: 'name' };
    }
  }
  return null;
}

export function describeDuplicate(reason: DuplicateReason): string {
  return reason === 'name' ? 'same name' : `same ${reason}`;
}
