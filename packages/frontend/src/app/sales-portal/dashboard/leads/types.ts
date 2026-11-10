export type LeadStatus = 'new' | 'claimed' | 'contacted' | 'won' | 'lost'
export type ScoreLabel = 'hot' | 'warm' | 'cold'

export interface Lead {
  id: string
  name: string
  phone: string
  business_name: string | null
  email: string | null
  website: string | null
  city: string | null
  state: string | null
  lead_type: string | null
  lead_type_label: string | null
  source: string
  source_label: string
  roles: string[]
  description: string | null
  status: LeadStatus
  claimed: boolean
  claimed_by_me: boolean
  claimed_by_id: string | null
  claimed_by_name: string | null
  claimed_at: string | null
  contact_visible: boolean
  notes: string | null
  custom_fields: Record<string, string | number>
  next_follow_up_at: string | null
  last_contacted_at: string | null
  score: number
  score_label: ScoreLabel
  created_at: string
}

export interface CustomField {
  id: string
  field_key: string
  label: string
  field_type: 'text' | 'number' | 'date' | 'select'
  options: string[]
}

export interface AgentOption {
  id: string
  name: string
  email: string
}

export interface Activity {
  id: string
  type: 'note' | 'call' | 'email' | 'sms' | 'meeting' | 'status_change' | 'assignment' | 'created'
  direction: 'outbound' | 'inbound' | null
  subject: string | null
  body: string | null
  outcome: string | null
  by_name: string | null
  created_at: string
}

export interface Attachment {
  id: string
  file_name: string
  mime_type: string | null
  size_bytes: number | null
  by_name: string | null
  created_at: string
}

export interface Script {
  id: string
  title: string
  audience: string
  body: string
  is_active: boolean
}

export interface DuplicateInfo {
  id: string
  name: string
  business_name: string | null
  status: LeadStatus
  claimed_by_me: boolean
  claimed_by_name: string | null
  reasons: Array<'phone' | 'email' | 'business'>
}

export interface ImportSummary {
  dry_run: boolean
  total: number
  imported: number
  duplicates: number
  invalid: number
  duplicate_details: Array<{ row: number; name: string; reasons: string[]; matches: string }>
  errors: Array<{ row: number; reason: string }>
}

export const STATUS_STYLE: Record<LeadStatus, string> = {
  new: 'bg-blue-50 text-blue-700 border-blue-200',
  claimed: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  contacted: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  won: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-gray-50 text-gray-500 border-gray-200',
}

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  claimed: 'Claimed',
  contacted: 'Contacted',
  won: 'Won',
  lost: 'Lost',
}

export const SCORE_STYLE: Record<ScoreLabel, string> = {
  hot: 'bg-red-50 text-red-700 border-red-200',
  warm: 'bg-amber-50 text-amber-700 border-amber-200',
  cold: 'bg-sky-50 text-sky-700 border-sky-200',
}

export const LEAD_TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'event_owner', label: 'Event Owner' },
  { value: 'caterer', label: 'Caterer' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'venue_owner', label: 'Venue Owner' },
  { value: 'promoter', label: 'Promoter' },
  { value: 'artist', label: 'Artist' },
  { value: 'other', label: 'Other' },
]

export const SOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'manual', label: 'Added manually' },
  { value: 'referral', label: 'Referral' },
  { value: 'social_media', label: 'Social media' },
  { value: 'networking_event', label: 'Networking event' },
  { value: 'website', label: 'Website' },
  { value: 'other', label: 'Other' },
]

export const ACTIVITY_LABEL: Record<Activity['type'], string> = {
  note: 'Note',
  call: 'Call',
  email: 'Email',
  sms: 'Text',
  meeting: 'Meeting',
  status_change: 'Status',
  assignment: 'Assignment',
  created: 'Added',
}

export const OUTCOMES = [
  'Reached',
  'No answer',
  'Left voicemail',
  'Replied',
  'Interested',
  'Not interested',
  'Demo booked',
  'Wrong number',
]

export function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message
  return Array.isArray(message) ? message.join(' ') : message || fallback
}

export function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

export function isOverdue(iso: string | null): boolean {
  return !!iso && Date.parse(iso) < Date.now()
}

export function fmtSize(bytes: number | null): string {
  if (!bytes) return ''
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Fills {{name}} and {{business}} in a script with the lead's details. */
export function fillScript(body: string, lead: Pick<Lead, 'name' | 'business_name'>): string {
  const first = lead.name.trim().split(/\s+/)[0] || lead.name
  return body.replace(/\{\{\s*name\s*\}\}/g, first).replace(/\{\{\s*business\s*\}\}/g, lead.business_name || 'your business')
}

export function placeLabel(lead: Pick<Lead, 'city' | 'state'>): string {
  return [lead.city, lead.state].filter(Boolean).join(', ')
}

/** The date part of an ISO timestamp, for a date input. */
export function toDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : ''
}
