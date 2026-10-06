/** Reads a dot-path (e.g. "venue.address.city") off a plain object. */
export function getByPath(obj: unknown, dotPath: string | undefined): unknown {
  if (!dotPath) return undefined;
  return dotPath
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

/** Resolves the array of raw records a REST/XML response should iterate over. */
export function resolveRecordsArray(
  body: unknown,
  recordsPath?: string,
): unknown[] {
  const target = recordsPath ? getByPath(body, recordsPath) : body;
  if (Array.isArray(target)) return target;
  if (target && typeof target === 'object') return [target];
  return [];
}

export function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return null;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- value is a primitive (string/number/boolean) at this point; feeds only ever supply primitives here.
  return String(value).trim() || null;
}

export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Best-effort split of an ISO or human date-time string into (date, time). */
export function splitDateTime(value: unknown): {
  date: string | null;
  time: string | null;
} {
  const str = toStringOrNull(value);
  if (!str) return { date: null, time: null };
  const d = new Date(str);
  if (Number.isNaN(d.getTime())) {
    // Already a plain "YYYY-MM-DD" or similar — take date portion only.
    const [datePart] = str.split('T');
    return { date: datePart || null, time: null };
  }
  const date = d.toISOString().slice(0, 10);
  const time =
    str.includes('T') || str.includes(':')
      ? d.toISOString().slice(11, 19)
      : null;
  return { date, time };
}
