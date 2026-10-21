import { isIP } from 'net';

interface RequestLike {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}

/** First x-forwarded-for entry (the app has no `trust proxy`), else the socket address. */
export function clientIp(req: RequestLike): string {
  const header = req.headers?.['x-forwarded-for'];
  const raw = Array.isArray(header) ? header[0] : header;
  const first = raw?.split(',')[0]?.trim();
  if (first && isIP(first)) return first;
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
