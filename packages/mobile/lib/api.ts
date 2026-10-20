import { supabase } from './supabase';

// Defaults to production; override locally via EXPO_PUBLIC_BACKEND_URL in
// .env.local (gitignored) to point at a local/demo backend for testing.
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || 'https://event-planning-app-backend-dq3s.onrender.com';

const DEFAULT_TIMEOUT_MS = 25000; // Render free-tier cold starts can take 20-30s

export async function apiRequest<T = any>(
  path: string,
  options: { method?: string; body?: any; timeoutMs?: number } = {},
): Promise<T> {
  let { data: { session } } = await supabase.auth.getSession();
  // Refresh proactively when the token is expired or about to expire (e.g. after
  // the app was backgrounded) so the backend doesn't reject it as "Invalid token".
  if (session?.expires_at && session.expires_at * 1000 - Date.now() < 60_000) {
    const { data } = await supabase.auth.refreshSession();
    if (data.session) session = data.session;
  }
  const token = session?.access_token;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    throw new Error(err?.message || 'Network request failed.');
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}
