import * as SecureStore from 'expo-secure-store';
import { BACKEND_URL } from '@/lib/api';

// Client-portal auth is separate from Supabase: phone + SMS code returns an opaque
// token that the backend expects in the `x-client-token` header.
const TOKEN_KEY = 'client_token';
const SESSION_KEY = 'client_session';
const DEFAULT_TIMEOUT_MS = 25000;

export interface ClientSession {
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  [key: string]: unknown;
}

export class ClientAuthError extends Error {
  constructor(message = 'Your session has expired. Please sign in again.') {
    super(message);
    this.name = 'ClientAuthError';
  }
}

export async function getClientToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function getClientSession(): Promise<ClientSession | null> {
  try {
    const raw = await SecureStore.getItemAsync(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ClientSession) : null;
  } catch {
    return null;
  }
}

export async function hasClientSession(): Promise<boolean> {
  return !!(await getClientToken());
}

export async function saveClientSession(token: string, client: ClientSession): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(client ?? {}));
}

export async function clearClientSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(SESSION_KEY).catch(() => {});
}

async function call<T>(path: string, options: { method?: string; body?: any; token?: string | null; timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BACKEND_URL}/client-portal${path}`, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { 'x-client-token': options.token } : {}),
      },
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
    if (res.status === 401 && options.token) {
      await clearClientSession();
      throw new ClientAuthError();
    }
    const message = Array.isArray(err.message) ? err.message.join(', ') : err.message;
    throw new Error(message || `Request failed: ${res.status}`);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Authenticated call to /client-portal/<path>. A 401 clears the session and throws ClientAuthError. */
export async function clientApi<T = any>(
  path: string,
  options: { method?: string; body?: any; timeoutMs?: number } = {},
): Promise<T> {
  const token = await getClientToken();
  if (!token) throw new ClientAuthError();
  return call<T>(path, { ...options, token });
}

export function requestClientOtp(name: string, phone: string, agreedToSms: boolean, agreedToTerms: boolean) {
  return call<{ message: string; devOtp?: string }>('/auth/request-otp', {
    method: 'POST',
    body: { name, phone, agreedToSms, agreedToTerms },
  });
}

export async function verifyClientOtp(phone: string, code: string, name?: string): Promise<ClientSession> {
  const res = await call<{ token: string; client: ClientSession }>('/auth/verify-otp', {
    method: 'POST',
    body: { phone, code, name },
  });
  await saveClientSession(res.token, res.client);
  return res.client;
}

export async function clientSignOut(): Promise<void> {
  const token = await getClientToken();
  if (token) await call('/auth/logout', { method: 'POST', body: {}, token }).catch(() => {});
  await clearClientSession();
}
