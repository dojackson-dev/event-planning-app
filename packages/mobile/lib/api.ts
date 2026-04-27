import { supabase } from './supabase';

export const BACKEND_URL = 'https://event-planning-app-backend-dq3s.onrender.com';

export async function apiRequest<T = any>(
  path: string,
  options: { method?: string; body?: any } = {},
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed: ${res.status}`);
  }

  return res.json();
}
