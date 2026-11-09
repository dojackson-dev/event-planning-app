/** Turns what a person typed into E.164 (+15551234567), or null if it is not a dialable number. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');

  let e164: string;
  if (trimmed.startsWith('+')) {
    e164 = `+${digits}`;
  } else if (digits.length === 10) {
    e164 = `+1${digits}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    e164 = `+${digits}`;
  } else {
    return null;
  }

  if (e164.length < 9 || e164.length > 16) return null;
  if (e164.startsWith('+1')) {
    // North America: +1, a 3-digit area code starting 2-9, then 7 digits.
    if (!/^\+1[2-9]\d{9}$/.test(e164)) return null;
  }
  return e164;
}

/** Premium-rate North American prefixes are never dialled, whatever the settings say. */
const PREMIUM_PREFIXES = ['+1900', '+1976'];

export function isAllowedDestination(
  e164: string,
  allowedPrefixes: string[],
): boolean {
  if (PREMIUM_PREFIXES.some((p) => e164.startsWith(p))) return false;
  return allowedPrefixes.some((p) => e164.startsWith(p));
}

export function maskNumber(e164: string | null | undefined): string | null {
  if (!e164) return null;
  return `•••• ${e164.slice(-4)}`;
}
