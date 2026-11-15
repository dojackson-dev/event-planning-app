/**
 * The code a door scanner read. Tickets show the bare id in their QR on the ticket page and in wallet
 * passes, but the emailed QR encodes the ticket's link (https://www.eventecos.com/ticket/<id>), so a
 * scanned value may be either. Returns the id in both cases.
 */
export function extractScanCode(scanned: unknown): string {
  const text = typeof scanned === 'string' ? scanned.trim() : '';
  if (!/^https?:\/\//i.test(text)) return text;
  try {
    const segments = new URL(text).pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments[segments.length - 1] ?? '') || text;
  } catch {
    return text;
  }
}
