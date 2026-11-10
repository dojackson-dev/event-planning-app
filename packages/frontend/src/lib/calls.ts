import api from './api'
import { createClient } from '@/lib/supabase/client'

export type TokenGetter = () => Promise<string | null>

/** The admin portal signs in through Supabase; the sales portal keeps its token in local storage. */
export const adminTokenGetter: TokenGetter = async () => {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export const salesTokenGetter: TokenGetter = async () =>
  typeof window === 'undefined' ? null : localStorage.getItem('access_token')

export interface CallProfile {
  kind: 'admin' | 'sales'
  name: string
  configured: boolean
  callingEnabled: boolean
  receivesInbound: boolean
  mobile: string | null
  mobileVerified: boolean
  pendingMobile: string | null
  maxCallsPerHour: number
}

export interface CallLog {
  id: string
  direction: 'outbound' | 'inbound'
  staff_name: string | null
  client_phone: string
  client_name: string | null
  status: string
  created_at: string
  answered_at: string | null
  ended_at: string | null
  duration_seconds: number | null
  outcome: string | null
  notes: string | null
}

export interface Voicemail {
  id: string
  from_number: string | null
  duration_seconds: number | null
  listened_at: string | null
  created_at: string
}

export const OUTCOME_LABELS: Record<string, string> = {
  connected: 'Spoke with them',
  left_voicemail: 'Left voicemail',
  no_answer: 'No answer',
  wrong_number: 'Wrong number',
  call_back_later: 'Call back later',
  interested: 'Interested',
  not_interested: 'Not interested',
  other: 'Other',
}

export const STATUS_LABELS: Record<string, string> = {
  initiated: 'Calling your phone…',
  staff_ringing: 'Answer your phone and press 1',
  ringing: 'Ringing',
  client_ringing: 'Calling the client…',
  in_progress: 'Connected',
  completed: 'Completed',
  staff_declined: 'You did not press 1',
  staff_no_answer: 'Your phone did not answer',
  client_no_answer: 'Client did not answer',
  client_busy: 'Client line busy',
  canceled: 'Canceled',
  failed: 'Failed',
  voicemail: 'Voicemail',
}

const FINISHED = new Set([
  'completed',
  'staff_declined',
  'staff_no_answer',
  'client_no_answer',
  'client_busy',
  'canceled',
  'failed',
  'voicemail',
])
export const isFinished = (status: string) => FINISHED.has(status)

export class CallsApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
  }
}

export async function callsRequest<T>(
  getToken: TokenGetter,
  method: 'get' | 'post' | 'patch' | 'put' | 'delete',
  path: string,
  data?: unknown,
  responseType?: 'blob',
): Promise<T> {
  const token = await getToken()
  if (!token) throw new CallsApiError('Please sign in again.', 401)
  try {
    const res = await api.request<T>({
      method,
      url: `/calls${path}`,
      data,
      responseType,
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.data
  } catch (err: unknown) {
    const e = err as {
      response?: { status?: number; data?: { message?: string; code?: string } }
    }
    throw new CallsApiError(
      e.response?.data?.message || 'Something went wrong. Please try again.',
      e.response?.status ?? 0,
      e.response?.data?.code,
    )
  }
}

let profileCache: { at: number; promise: Promise<CallProfile> } | null = null

/** Shared for a minute so a page full of Call buttons asks the server once. */
export function loadCallProfile(
  getToken: TokenGetter,
  force = false,
): Promise<CallProfile> {
  if (!force && profileCache && Date.now() - profileCache.at < 60_000) {
    return profileCache.promise
  }
  const promise = callsRequest<CallProfile>(getToken, 'get', '/me')
  profileCache = { at: Date.now(), promise }
  promise.catch(() => {
    if (profileCache?.promise === promise) profileCache = null
  })
  return promise
}

export function clearCallProfileCache() {
  profileCache = null
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatCallTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
