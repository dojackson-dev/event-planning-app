import { DuplicateKeys } from './lead-validation';

export type DuplicateReason = 'phone' | 'email' | 'business';

export interface DuplicateCandidate {
  id: string;
  name: string;
  business_name: string | null;
  status: string;
  claimed_by_affiliate_id: string | null;
  phone_digits: string | null;
  email_key: string | null;
  business_key: string | null;
  claimed_by?: { first_name: string | null; last_name: string | null } | null;
}

export interface DuplicateMatch {
  row: DuplicateCandidate;
  reasons: DuplicateReason[];
}

/** Compares one prospect's phone, email and business name against existing leads. */
export function matchDuplicates(
  rows: DuplicateCandidate[],
  keys: DuplicateKeys,
  exceptId?: string,
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  for (const row of rows) {
    if (exceptId && row.id === exceptId) continue;
    const reasons: DuplicateReason[] = [];
    if (keys.phone && row.phone_digits === keys.phone) reasons.push('phone');
    if (keys.email && row.email_key === keys.email) reasons.push('email');
    if (keys.business && row.business_key === keys.business) {
      reasons.push('business');
    }
    if (reasons.length) matches.push({ row, reasons });
  }
  return matches;
}
