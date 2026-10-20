// Small formatting/normalizing helpers shared by the portal + directory screens.

export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const fmtMoney = (v: unknown, digits = 2): string =>
  `$${num(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const fmtDate = (d?: string | null, withYear = true): string => {
  if (!d) return '';
  const date = new Date(d.includes('T') ? d : `${d}T00:00:00`);
  if (isNaN(date.getTime())) return d;
  return date.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}),
  });
};

// "14:30:00" / "14:30" -> "2:30 PM"
export const fmtTime = (t?: string | null): string => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return t;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${(m || '00').slice(0, 2)} ${suffix}`;
};

// Accepts a raw array or an envelope like { data | items | <key>: [...] }.
export const toList = <T = any>(data: any, ...keys: string[]): T[] => {
  if (Array.isArray(data)) return data;
  for (const k of [...keys, 'data', 'items']) {
    if (Array.isArray(data?.[k])) return data[k];
  }
  return [];
};

export const titleCase = (s?: string | null): string =>
  (s || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const isoDate = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
