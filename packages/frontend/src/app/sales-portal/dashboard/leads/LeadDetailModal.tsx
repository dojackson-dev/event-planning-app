'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Copy, Download, FileText, Loader2, Paperclip, Trash2, X } from 'lucide-react'
import api from '@/lib/api'
import {
  ACTIVITY_LABEL,
  Activity,
  Attachment,
  CustomField,
  Lead,
  OUTCOMES,
  SCORE_STYLE,
  STATUS_LABEL,
  STATUS_STYLE,
  Script,
  errorMessage,
  fillScript,
  fmtDay,
  fmtSize,
  fmtWhen,
  isOverdue,
  placeLabel,
} from './types'

interface Props {
  lead: Lead
  scripts: Script[]
  customFields: CustomField[]
  onClose: () => void
  onEdit: () => void
  /** Called after anything that changes the lead (a logged call, a new follow-up date). */
  onChanged: () => void
}

type Section = 'activity' | 'files' | 'script'

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
const LOGGABLE: Array<{ value: 'call' | 'email' | 'sms' | 'meeting' | 'note'; label: string }> = [
  { value: 'call', label: 'Call' },
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'Text' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'note', label: 'Note' },
]

export default function LeadDetailModal({ lead, scripts, customFields, onClose, onEdit, onChanged }: Props) {
  const [section, setSection] = useState<Section>('activity')
  const [activities, setActivities] = useState<Activity[] | null>(null)
  const [attachments, setAttachments] = useState<Attachment[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ type: 'call', direction: 'outbound', outcome: '', subject: '', body: '', follow_up_at: '' })
  const [scriptId, setScriptId] = useState<string>('')
  const fileInput = useRef<HTMLInputElement>(null)
  const canWork = lead.contact_visible

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const loadActivities = useCallback(async () => {
    try {
      setLoadError(null)
      const res = await api.get<{ activities: Activity[] }>(`/affiliates/leads/${lead.id}/activities`)
      setActivities(res.data.activities)
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load activity.'))
    }
  }, [lead.id])

  const loadAttachments = useCallback(async () => {
    try {
      setLoadError(null)
      const res = await api.get<{ attachments: Attachment[] }>(`/affiliates/leads/${lead.id}/attachments`)
      setAttachments(res.data.attachments)
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load files.'))
    }
  }, [lead.id])

  useEffect(() => {
    if (!canWork) return
    if (section === 'activity') loadActivities()
    if (section === 'files') loadAttachments()
  }, [section, canWork, loadActivities, loadAttachments])

  const relevantScripts = useMemo(() => {
    const matching = scripts.filter(s => s.audience === lead.lead_type)
    const general = scripts.filter(s => s.audience === 'any')
    const rest = scripts.filter(s => s.audience !== lead.lead_type && s.audience !== 'any')
    return [...matching, ...general, ...rest]
  }, [scripts, lead.lead_type])
  const activeScript = relevantScripts.find(s => s.id === scriptId) ?? relevantScripts[0]

  const logActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setNotice(null)
    try {
      await api.post(`/affiliates/leads/${lead.id}/activities`, {
        type: form.type,
        direction: form.type === 'email' || form.type === 'sms' || form.type === 'call' ? form.direction : undefined,
        outcome: form.outcome || undefined,
        subject: form.subject || undefined,
        body: form.body || undefined,
        follow_up_at: form.follow_up_at || undefined,
      })
      setForm(f => ({ ...f, outcome: '', subject: '', body: '', follow_up_at: '' }))
      setNotice('Logged.')
      await loadActivities()
      onChanged()
    } catch (err) {
      setNotice(errorMessage(err, 'Could not log that. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const upload = async (file: File) => {
    setBusy(true)
    setNotice(null)
    try {
      const data = new FormData()
      data.append('file', file)
      await api.post(`/affiliates/leads/${lead.id}/attachments`, data, { headers: { 'Content-Type': 'multipart/form-data' } })
      setNotice(`${file.name} was attached.`)
      await loadAttachments()
    } catch (err) {
      setNotice(errorMessage(err, 'Could not attach that file.'))
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const download = async (attachment: Attachment) => {
    try {
      const res = await api.get<{ url: string }>(`/affiliates/leads/${lead.id}/attachments/${attachment.id}/url`)
      window.open(res.data.url, '_blank', 'noopener')
    } catch (err) {
      setNotice(errorMessage(err, 'Could not open that file.'))
    }
  }

  const removeAttachment = async (attachment: Attachment) => {
    if (!confirm(`Remove ${attachment.file_name}?`)) return
    try {
      await api.delete(`/affiliates/leads/${lead.id}/attachments/${attachment.id}`)
      await loadAttachments()
    } catch (err) {
      setNotice(errorMessage(err, 'Could not remove that file.'))
    }
  }

  const copyScript = async () => {
    if (!activeScript) return
    try {
      await navigator.clipboard.writeText(fillScript(activeScript.body, lead))
      setNotice('Script copied.')
    } catch {
      setNotice('Could not copy. Select the text and copy it instead.')
    }
  }

  const sections: Array<{ id: Section; label: string }> = [
    { id: 'activity', label: 'Activity' },
    { id: 'files', label: 'Files' },
    { id: 'script', label: 'Call script' },
  ]
  const customRows = customFields.filter(f => lead.custom_fields[f.field_key] !== undefined)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="lead-detail-title" className="my-8 w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h2 id="lead-detail-title" className="text-lg font-semibold text-gray-900">{lead.business_name || lead.name}</h2>
            {lead.business_name && <p className="text-sm text-gray-600">{lead.name}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
              <span className={`rounded-full border px-2 py-0.5 font-medium ${STATUS_STYLE[lead.status]}`}>{STATUS_LABEL[lead.status]}</span>
              <span className={`rounded-full border px-2 py-0.5 font-medium capitalize ${SCORE_STYLE[lead.score_label]}`}>{lead.score_label} · {lead.score}</span>
              {lead.lead_type_label && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{lead.lead_type_label}</span>}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{lead.source_label}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {(canWork) && <button type="button" onClick={onEdit} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Edit</button>}
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div><dt className="text-xs text-gray-500">Phone</dt><dd className="text-gray-900">{canWork ? <a href={`tel:${lead.phone}`} className="text-indigo-600 hover:underline">{lead.phone}</a> : lead.phone}</dd></div>
            <div><dt className="text-xs text-gray-500">Email</dt><dd className="text-gray-900">{lead.email ? <a href={`mailto:${lead.email}`} className="text-indigo-600 hover:underline break-all">{lead.email}</a> : <span className="text-gray-400">{canWork ? 'Not added' : 'Claim to see'}</span>}</dd></div>
            <div><dt className="text-xs text-gray-500">Website</dt><dd className="text-gray-900 break-all">{lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{lead.website}</a> : <span className="text-gray-400">Not added</span>}</dd></div>
            <div><dt className="text-xs text-gray-500">Location</dt><dd className="text-gray-900">{placeLabel(lead) || <span className="text-gray-400">Not added</span>}</dd></div>
            <div><dt className="text-xs text-gray-500">Follow up</dt><dd className={isOverdue(lead.next_follow_up_at) && lead.status !== 'won' && lead.status !== 'lost' ? 'font-medium text-red-600' : 'text-gray-900'}>{lead.next_follow_up_at ? fmtDay(lead.next_follow_up_at) : <span className="text-gray-400">Not set</span>}</dd></div>
            <div><dt className="text-xs text-gray-500">Last contacted</dt><dd className="text-gray-900">{lead.last_contacted_at ? fmtWhen(lead.last_contacted_at) : <span className="text-gray-400">Never</span>}</dd></div>
            {customRows.map(f => (
              <div key={f.id}><dt className="text-xs text-gray-500">{f.label}</dt><dd className="text-gray-900">{String(lead.custom_fields[f.field_key])}</dd></div>
            ))}
          </dl>
          {lead.description && <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{lead.description}</p>}

          {!canWork ? (
            <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">Claim this lead to log calls, attach files and see the full contact details.</p>
          ) : (
            <>
              <div className="flex gap-1 border-b border-gray-200" role="tablist">
                {sections.map(s => (
                  <button
                    key={s.id}
                    role="tab"
                    aria-selected={section === s.id}
                    onClick={() => { setSection(s.id); setNotice(null) }}
                    className={`border-b-2 px-3 py-2 text-sm font-medium ${section === s.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <p aria-live="polite" className="min-h-[1.25rem] text-sm text-indigo-700">{notice}</p>
              {loadError && <p role="alert" className="text-sm text-red-600">{loadError}</p>}

              {section === 'activity' && (
                <div className="space-y-4">
                  <form onSubmit={logActivity} className="space-y-3 rounded-xl border border-gray-200 p-3">
                    <div className="flex flex-wrap gap-2">
                      <div>
                        <label htmlFor="act-type" className="mb-1 block text-xs font-medium text-gray-600">Log a</label>
                        <select id="act-type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={inputClass}>
                          {LOGGABLE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      {(form.type === 'call' || form.type === 'email' || form.type === 'sms') && (
                        <div>
                          <label htmlFor="act-dir" className="mb-1 block text-xs font-medium text-gray-600">Direction</label>
                          <select id="act-dir" value={form.direction} onChange={e => setForm(f => ({ ...f, direction: e.target.value }))} className={inputClass}>
                            <option value="outbound">I contacted them</option>
                            <option value="inbound">They contacted me</option>
                          </select>
                        </div>
                      )}
                      {form.type !== 'note' && (
                        <div>
                          <label htmlFor="act-outcome" className="mb-1 block text-xs font-medium text-gray-600">Outcome</label>
                          <select id="act-outcome" value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} className={inputClass}>
                            <option value="">Not set</option>
                            {OUTCOMES.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    {form.type === 'email' && (
                      <div>
                        <label htmlFor="act-subject" className="mb-1 block text-xs font-medium text-gray-600">Email subject</label>
                        <input id="act-subject" maxLength={200} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className={inputClass} />
                      </div>
                    )}
                    <div>
                      <label htmlFor="act-body" className="mb-1 block text-xs font-medium text-gray-600">{form.type === 'email' ? 'What you sent or what they said' : 'Details'}</label>
                      <textarea id="act-body" rows={3} maxLength={4000} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} className={`${inputClass} resize-none`} />
                    </div>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <label htmlFor="act-follow" className="mb-1 block text-xs font-medium text-gray-600">Next follow-up (optional)</label>
                        <input id="act-follow" type="date" value={form.follow_up_at} onChange={e => setForm(f => ({ ...f, follow_up_at: e.target.value }))} className={inputClass} />
                      </div>
                      <button type="submit" disabled={busy || (!form.body.trim() && !form.subject.trim() && !form.outcome)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />} Log it
                      </button>
                    </div>
                  </form>

                  {!activities && !loadError ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" aria-label="Loading activity" /></div>
                  ) : activities && activities.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">Nothing logged yet. Log your first call or email above.</p>
                  ) : (
                    <ol className="space-y-3">
                      {(activities ?? []).map(a => (
                        <li key={a.id} className="rounded-lg border border-gray-100 p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium text-gray-900">
                              {ACTIVITY_LABEL[a.type]}
                              {a.direction === 'inbound' && ' (from them)'}
                              {a.outcome && <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-700">{a.outcome}</span>}
                            </span>
                            <span className="text-xs text-gray-400">{a.by_name ? `${a.by_name} · ` : ''}{fmtWhen(a.created_at)}</span>
                          </div>
                          {a.subject && <p className="mt-1 text-gray-800">{a.subject}</p>}
                          {a.body && <p className="mt-1 whitespace-pre-wrap text-gray-600">{a.body}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}

              {section === 'files' && (
                <div className="space-y-3">
                  <div>
                    <input ref={fileInput} id="lead-file" type="file" className="sr-only" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.csv" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
                    <label htmlFor="lead-file" className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" aria-hidden="true" />} Attach a file
                    </label>
                    <p className="mt-1 text-xs text-gray-500">PDF, Word, Excel, images, CSV or TXT, up to 10 MB.</p>
                  </div>
                  {!attachments && !loadError ? (
                    <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-indigo-600" aria-label="Loading files" /></div>
                  ) : attachments && attachments.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">No files attached yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                      {(attachments ?? []).map(a => (
                        <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2"><FileText className="w-4 h-4 shrink-0 text-gray-400" aria-hidden="true" /><span className="truncate text-gray-800">{a.file_name}</span><span className="shrink-0 text-xs text-gray-400">{fmtSize(a.size_bytes)}</span></span>
                          <span className="flex shrink-0 items-center gap-1">
                            <button type="button" onClick={() => download(a)} aria-label={`Download ${a.file_name}`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Download className="w-4 h-4" /></button>
                            <button type="button" onClick={() => removeAttachment(a)} aria-label={`Remove ${a.file_name}`} className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><Trash2 className="w-4 h-4" /></button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {section === 'script' && (
                <div className="space-y-3">
                  {relevantScripts.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500">No call scripts yet. The sales manager can add them on the Call scripts page.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-end gap-2">
                        <div className="min-w-0 flex-1">
                          <label htmlFor="script-pick" className="mb-1 block text-xs font-medium text-gray-600">Script</label>
                          <select id="script-pick" value={activeScript?.id ?? ''} onChange={e => setScriptId(e.target.value)} className={inputClass}>
                            {relevantScripts.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                          </select>
                        </div>
                        <button type="button" onClick={copyScript} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"><Copy className="w-4 h-4" aria-hidden="true" /> Copy</button>
                      </div>
                      {activeScript && <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-sans text-sm text-gray-800">{fillScript(activeScript.body, lead)}</pre>}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
