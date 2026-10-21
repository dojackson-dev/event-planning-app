import { BACKEND_URL } from '@/lib/api';
import { ClientAuthError, clearClientSession, getClientToken } from '@/lib/clientApi';

// The RSVP endpoints live at /rsvp/* (not /client-portal/*) but accept the same
// x-client-token header, so clientApi() can't be used for them.
export async function rsvpApi<T = any>(
  path: string,
  options: { method?: string; body?: unknown; timeoutMs?: number } = {},
): Promise<T> {
  const token = await getClientToken();
  if (!token) throw new ClientAuthError();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 25000);
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/rsvp${path}`, {
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', 'x-client-token': token },
      ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Request timed out. Please check your connection and try again.');
    throw new Error(err?.message || 'Network request failed.');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) {
      await clearClientSession();
      throw new ClientAuthError();
    }
    const message = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(message || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
