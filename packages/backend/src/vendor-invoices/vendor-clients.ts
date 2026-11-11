export interface ClientSourceRow {
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  created_at?: string | null;
}

export interface VendorClient {
  /** Stable id for the picker: the email, else the phone digits, else the lowercase name. */
  key: string;
  name: string;
  email: string;
  phone: string;
  last_used: string | null;
}

const clean = (value: string | null | undefined) => (value ?? '').trim();

export function clientKey(row: ClientSourceRow): string | null {
  const email = clean(row.client_email).toLowerCase();
  if (email) return `e:${email}`;
  const digits = clean(row.client_phone).replace(/\D/g, '');
  if (digits.length >= 7) return `p:${digits.slice(-10)}`;
  const name = clean(row.client_name).toLowerCase();
  return name ? `n:${name}` : null;
}

/**
 * Turns bookings, requests, invoices and estimates into one list of distinct people.
 * The most recent record wins for each detail, and gaps are filled from older ones.
 */
export function mergeVendorClients(rows: ClientSourceRow[]): VendorClient[] {
  const sorted = [...rows].sort((a, b) =>
    String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
  );
  const byKey = new Map<string, VendorClient>();

  for (const row of sorted) {
    const key = clientKey(row);
    if (!key) continue;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        key,
        name: clean(row.client_name),
        email: clean(row.client_email),
        phone: clean(row.client_phone),
        last_used: row.created_at ?? null,
      });
      continue;
    }
    existing.name ||= clean(row.client_name);
    existing.email ||= clean(row.client_email);
    existing.phone ||= clean(row.client_phone);
  }

  return [...byKey.values()]
    .filter((c) => c.name || c.email)
    .map((c) => ({ ...c, name: c.name || c.email }))
    .sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
}
