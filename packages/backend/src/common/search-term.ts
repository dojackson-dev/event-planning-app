/**
 * Cleans a user-typed search term before it goes into a PostgREST
 * `or(...ilike...)` filter: drops characters that act as filter syntax or
 * wildcards, collapses whitespace and caps the length. Returns '' when the
 * term is too short to be a useful search.
 */
export function sanitizeSearchTerm(raw?: string): string {
  if (!raw) return '';
  const term = raw
    .replace(/[%_,()*\\"'`:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return term.length >= 2 ? term : '';
}
