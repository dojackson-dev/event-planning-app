'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import api from '@/lib/api'
import {
  AgentOption,
  CustomField,
  DuplicateInfo,
  LEAD_TYPE_OPTIONS,
  Lead,
  SOURCE_OPTIONS,
  STATUS_LABEL,
  errorMessage,
  toDateInput,
} from './types'

interface Props {
  /** Editing when set, adding a new lead when null. */
  lead: Lead | null
  isManager: boolean
  agents: AgentOption[]
  customFields: CustomField[]
  onClose: () => void
  onSaved: (message: string) => void
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function DuplicateWarning({ duplicates }: { duplicates: DuplicateInfo[] }) {
  return (
    <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="flex items-center gap-1.5 font-semibold">
        <AlertTriangle className="w-4 h-4" aria-hidden="true" /> This may be someone we already have
      </p>
      <ul className="mt-1.5 space-y-1">
        {duplicates.map(d => (
          <li key={d.id}>
            <span className="font-medium">{d.business_name || d.name}</span>
            {d.business_name && <span> ({d.name})</span>} matches on {d.reasons.map(r => (r === 'business' ? 'business name' : r)).join(' and ')}.{' '}
            {STATUS_LABEL[d.status]} lead
            {d.claimed_by_me ? ', held by you' : d.claimed_by_name ? `, held by ${d.claimed_by_name}` : ', not claimed yet'}.
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function LeadFormModal({ lead, isManager, agents, customFields, onClose, onSaved }: Props) {
  const editing = lead !== null
  const [form, setForm] = useState({
    name: lead?.name ?? '',
    phone: lead?.phone ?? '',
    business_name: lead?.business_name ?? '',
    email: lead?.email ?? '',
    website: lead?.website ?? '',
    city: lead?.city ?? '',
    state: lead?.state ?? '',
    lead_type: lead?.lead_type ?? '',
    source: lead && ['manual', 'referral', 'social_media', 'networking_event', 'website', 'other'].includes(lead.source) ? lead.source : 'manual',
    description: lead?.description ?? '',
    next_follow_up_at: toDateInput(lead?.next_follow_up_at ?? null),
    assign_to: 'me',
  })
  const [custom, setCustom] = useState<Record<string, string>>(
    Object.fromEntries(
      Object.entries(lead?.custom_fields ?? {})
        .filter(([key]) => customFields.some(field => field.field_key === key))
        .map(([key, value]) => [key, String(value)]),
    ),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [confirmDuplicate, setConfirmDuplicate] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const editable = !editing || lead.contact_visible || isManager

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    if (key === 'phone' || key === 'email' || key === 'business_name') setConfirmDuplicate(false)
  }

  // Warn about a likely duplicate as soon as a phone, email or business name is filled in.
  const checkDuplicates = async () => {
    const { phone, email, business_name } = form
    if (!phone.trim() && !email.trim() && !business_name.trim()) return
    try {
      const res = await api.post<{ duplicates: DuplicateInfo[] }>('/affiliates/leads/check-duplicates', {
        phone,
        email,
        business_name,
        exclude_id: lead?.id,
      })
      setDuplicates(res.data.duplicates)
    } catch {
      setDuplicates([])
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const customValues = Object.fromEntries(Object.entries(custom).map(([k, v]) => [k, v.trim()]))
    const body: Record<string, unknown> = {
      name: form.name,
      phone: form.phone,
      business_name: form.business_name,
      email: form.email,
      website: form.website,
      city: form.city,
      state: form.state,
      lead_type: form.lead_type || null,
      description: form.description,
      next_follow_up_at: form.next_follow_up_at || null,
      custom_fields: customValues,
    }
    if (confirmDuplicate) body.force = true
    try {
      if (editing) {
        await api.patch(`/affiliates/leads/${lead.id}`, body)
        onSaved(`${form.name} was updated.`)
      } else {
        body.source = form.source
        if (isManager) body.assign_to = form.assign_to
        await api.post('/affiliates/leads', body)
        onSaved(`${form.name} was added.`)
      }
    } catch (err) {
      const data = (err as { response?: { status?: number; data?: { code?: string; duplicates?: DuplicateInfo[] } } })?.response
      if (data?.status === 409 && data.data?.code === 'duplicate_lead') {
        setDuplicates(data.data.duplicates ?? [])
        setConfirmDuplicate(true)
        setError('Review the possible duplicate below, then choose Save anyway if this is a different prospect.')
      } else {
        setError(errorMessage(err, 'Could not save this lead. Please try again.'))
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="lead-form-title" className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 id="lead-form-title" className="text-lg font-semibold text-gray-900">{editing ? 'Edit lead' : 'Add a lead'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          {!editable && (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Claim this lead to edit its contact details.</p>
          )}
          <fieldset disabled={!editable || saving} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lf-name" className="mb-1 block text-xs font-medium text-gray-600">Contact name *</label>
                <input id="lf-name" required maxLength={120} value={form.name} onChange={set('name')} className={inputClass} autoComplete="off" />
              </div>
              <div>
                <label htmlFor="lf-business" className="mb-1 block text-xs font-medium text-gray-600">Business name</label>
                <input id="lf-business" maxLength={160} value={form.business_name} onChange={set('business_name')} onBlur={checkDuplicates} className={inputClass} autoComplete="off" />
              </div>
              <div>
                <label htmlFor="lf-phone" className="mb-1 block text-xs font-medium text-gray-600">Phone number *</label>
                <input id="lf-phone" required type="tel" maxLength={40} value={form.phone} onChange={set('phone')} onBlur={checkDuplicates} className={inputClass} placeholder="(404) 555-0123" autoComplete="off" />
              </div>
              <div>
                <label htmlFor="lf-email" className="mb-1 block text-xs font-medium text-gray-600">Email</label>
                <input id="lf-email" type="email" maxLength={254} value={form.email} onChange={set('email')} onBlur={checkDuplicates} className={inputClass} autoComplete="off" />
              </div>
              <div>
                <label htmlFor="lf-type" className="mb-1 block text-xs font-medium text-gray-600">Type of business</label>
                <select id="lf-type" value={form.lead_type} onChange={set('lead_type')} className={inputClass}>
                  <option value="">Not set</option>
                  {LEAD_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="lf-website" className="mb-1 block text-xs font-medium text-gray-600">Website</label>
                <input id="lf-website" maxLength={200} value={form.website} onChange={set('website')} className={inputClass} placeholder="example.com" autoComplete="off" />
              </div>
              <div>
                <label htmlFor="lf-city" className="mb-1 block text-xs font-medium text-gray-600">City</label>
                <input id="lf-city" maxLength={80} value={form.city} onChange={set('city')} className={inputClass} autoComplete="off" />
              </div>
              <div>
                <label htmlFor="lf-state" className="mb-1 block text-xs font-medium text-gray-600">State</label>
                <input id="lf-state" maxLength={40} value={form.state} onChange={set('state')} className={inputClass} autoComplete="off" />
              </div>
              {!editing && (
                <div>
                  <label htmlFor="lf-source" className="mb-1 block text-xs font-medium text-gray-600">Where did you find them?</label>
                  <select id="lf-source" value={form.source} onChange={set('source')} className={inputClass}>
                    {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="lf-follow" className="mb-1 block text-xs font-medium text-gray-600">Follow up on</label>
                <input id="lf-follow" type="date" value={form.next_follow_up_at} onChange={set('next_follow_up_at')} className={inputClass} />
              </div>
              {isManager && !editing && (
                <div className="sm:col-span-2">
                  <label htmlFor="lf-assign" className="mb-1 block text-xs font-medium text-gray-600">Assign to</label>
                  <select id="lf-assign" value={form.assign_to} onChange={set('assign_to')} className={inputClass}>
                    <option value="me">Me</option>
                    <option value="pool">Leave in the pool for agents to claim</option>
                    {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="lf-desc" className="mb-1 block text-xs font-medium text-gray-600">About this prospect</label>
              <textarea id="lf-desc" rows={3} maxLength={2000} value={form.description} onChange={set('description')} className={`${inputClass} resize-none`} placeholder="What they do, what they need, how you found them..." />
            </div>

            {customFields.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                {customFields.map(field => (
                  <div key={field.id}>
                    <label htmlFor={`cf-${field.field_key}`} className="mb-1 block text-xs font-medium text-gray-600">{field.label}</label>
                    {field.field_type === 'select' ? (
                      <select id={`cf-${field.field_key}`} value={custom[field.field_key] ?? ''} onChange={e => setCustom(c => ({ ...c, [field.field_key]: e.target.value }))} className={inputClass}>
                        <option value="">Not set</option>
                        {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        id={`cf-${field.field_key}`}
                        type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                        maxLength={500}
                        value={custom[field.field_key] ?? ''}
                        onChange={e => setCustom(c => ({ ...c, [field.field_key]: e.target.value }))}
                        className={inputClass}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </fieldset>

          {duplicates.length > 0 && <DuplicateWarning duplicates={duplicates} />}
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving || !editable} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {confirmDuplicate ? 'Save anyway' : editing ? 'Save changes' : 'Add lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
