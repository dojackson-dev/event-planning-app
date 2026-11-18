'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { Shield, Plus, X, Loader2, Send, Copy, Check, Trash2, UserPlus, Undo2 } from 'lucide-react'

interface Guard {
  id: string
  name: string
  phone: string
  post: string | null
  notes: string | null
  report_time: string | null
  arrival_time: string | null
  arrival_source: 'guard' | 'manager' | null
  check_in_link: string
}

interface Person { name: string; phone: string }

const fmtTime = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const fmtStamp = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
const errorText = (err: any, fallback: string) => {
  const detail = err?.response?.data?.message
  return Array.isArray(detail) ? detail.join(' ') : detail || fallback
}
const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

/** Who is guarding an event: needed vs assigned, add guards in one dialog, and see who has arrived. */
export default function EventSecurity({ eventId, needed }: { eventId: string; needed?: number }) {
  const [guards, setGuards] = useState<Guard[] | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ guards: Guard[] }>(`/security/event/${eventId}/guards`)
      setGuards(res.data.guards)
      setError('')
    } catch (err) {
      setError(errorText(err, 'We could not load security for this event. Please refresh to try again.'))
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const flash = (t: string) => { setNotice(t); setTimeout(() => setNotice(''), 5000) }
  const act = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); flash(ok); await load() } catch (err) { flash(errorText(err, 'That did not work. Please try again.')) }
  }

  const arrived = (guards ?? []).filter(g => g.arrival_time).length
  const count = guards?.length ?? 0
  const short = needed && needed > count ? needed - count : 0

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-700">
          <strong>{count}</strong>{needed ? ` of ${needed}` : ''} guard{count === 1 ? '' : 's'} assigned
          {count > 0 && <> · <span className={arrived === count ? 'text-green-700 font-medium' : ''}>{arrived} arrived</span></>}
          {short > 0 && <span className="ml-2 text-xs font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">{short} still needed</span>}
        </p>
        <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 font-medium">
          <Plus className="w-3.5 h-3.5" /> Add guards
        </button>
      </div>

      {notice && <div className="text-xs rounded-lg bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2" role="status">{notice}</div>}
      {error && <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">{error}</div>}

      {guards === null && !error ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
      ) : count === 0 && !error ? (
        <div className="text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg py-6">
          <Shield className="w-7 h-7 mx-auto mb-2 opacity-30" />
          No guards on this event yet. Add them and they are texted their post and a check-in link.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {(guards ?? []).map(g => (
            <li key={g.id} className="px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                  <p className="text-xs text-gray-500">
                    {g.phone}{g.report_time && ` · report ${fmtTime(g.report_time)}`}{g.post && ` · ${g.post}`}
                  </p>
                </div>
                {g.arrival_time ? (
                  <span className="text-xs font-medium text-green-700 bg-green-50 rounded-full px-2.5 py-1">
                    Arrived {fmtStamp(g.arrival_time)}{g.arrival_source === 'manager' ? ' (marked by you)' : ''}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 rounded-full px-2.5 py-1">Not arrived</span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.arrival_time ? (
                  <button type="button" onClick={() => act(() => api.post(`/security/guard/${g.id}/arrived`, { arrived: false }), 'Arrival cleared.')} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1"><Undo2 className="w-3 h-3" /> Undo arrival</button>
                ) : (
                  <>
                    <button type="button" onClick={() => act(() => api.post(`/security/guard/${g.id}/arrived`, { arrived: true }), `${g.name} marked arrived.`)} className="inline-flex items-center gap-1 text-xs text-green-700 hover:bg-green-50 rounded px-2 py-1"><Check className="w-3 h-3" /> Mark arrived</button>
                    <button type="button" onClick={() => act(async () => { const r = await api.post(`/security/guard/${g.id}/resend`); if (!r.data.texted) throw { response: { data: { message: 'The text could not be sent. Copy their link and send it yourself.' } } } }, 'Text sent.')} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1"><Send className="w-3 h-3" /> Text again</button>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(g.check_in_link); flash('Link copied.') }} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1"><Copy className="w-3 h-3" /> Copy link</button>
                  </>
                )}
                <button type="button" onClick={() => { if (confirm(`Remove ${g.name} from this event?`)) act(() => api.delete(`/security/${g.id}`), `${g.name} removed.`) }} className="inline-flex items-center gap-1 text-xs text-red-600 hover:bg-red-50 rounded px-2 py-1"><Trash2 className="w-3 h-3" /> Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && <AddGuardsModal eventId={eventId} onClose={() => setAdding(false)} onDone={(t) => { setAdding(false); flash(t); load() }} />}
    </div>
  )
}

function AddGuardsModal({ eventId, onClose, onDone }: { eventId: string; onClose: () => void; onDone: (text: string) => void }) {
  const [directory, setDirectory] = useState<Person[] | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [typed, setTyped] = useState<Person[]>([{ name: '', phone: '' }])
  const [form, setForm] = useState({ report_time: '', post: '', notes: '', send_text: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Person[]>(`/security/event/${eventId}/directory`).then(r => setDirectory(r.data)).catch(() => setDirectory([]))
  }, [eventId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const fromDirectory = (directory ?? []).filter(p => picked.includes(p.phone))
    const fromTyped = typed.filter(t => t.name.trim() || t.phone.trim())
    const guards = [...fromDirectory, ...fromTyped]
    if (guards.length === 0) { setError('Choose or enter at least one guard.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await api.post<{ guards: { name: string; texted: boolean }[]; skipped: string[] }>(`/security/event/${eventId}/assign`, {
        guards,
        report_time: form.report_time || null,
        post: form.post || null,
        notes: form.notes || null,
        send_text: form.send_text,
      })
      const failed = res.data.guards.filter(g => !g.texted).length
      const skipped = res.data.skipped.length ? ` ${res.data.skipped.join(', ')} ${res.data.skipped.length === 1 ? 'was' : 'were'} already on this event.` : ''
      onDone(
        (!form.send_text
          ? `Added ${res.data.guards.length}. Use "Copy link" on each guard to share their check-in link.`
          : failed
            ? `Added ${res.data.guards.length}, but ${failed} text${failed === 1 ? '' : 's'} could not be sent. Use "Copy link" on those guards.`
            : `Added ${res.data.guards.length} and texted ${res.data.guards.length === 1 ? 'their' : 'each'} post and check-in link.`) + skipped,
      )
    } catch (err) {
      setError(errorText(err, 'Could not add the guards. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4" role="dialog" aria-label="Add guards">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Add security guards</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {directory && directory.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Guards you have used before</label>
              <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto divide-y divide-gray-100">
                {directory.map(p => (
                  <label key={p.phone} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={picked.includes(p.phone)} onChange={e => setPicked(x => e.target.checked ? [...x, p.phone] : x.filter(v => v !== p.phone))} />
                    <span className="flex-1">{p.name}</span><span className="text-xs text-gray-400">{p.phone}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{directory && directory.length > 0 ? 'Or add someone new' : 'Who is guarding?'}</label>
            <div className="space-y-2">
              {typed.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input className={inputClass} placeholder="Name" value={t.name} onChange={e => setTyped(list => list.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <input className={inputClass} type="tel" placeholder="Mobile number" value={t.phone} onChange={e => setTyped(list => list.map((x, j) => j === i ? { ...x, phone: e.target.value } : x))} />
                  {typed.length > 1 && <button type="button" aria-label="Remove row" onClick={() => setTyped(list => list.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600"><X className="w-4 h-4" /></button>}
                </div>
              ))}
              <button type="button" onClick={() => setTyped(l => [...l, { name: '', phone: '' }])} className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"><UserPlus className="w-3.5 h-3.5" /> Add another</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Report time</label><input type="time" className={inputClass} value={form.report_time} onChange={e => setForm({ ...form, report_time: e.target.value })} /></div>
            <div><label className="block text-xs font-medium text-gray-600 mb-1">Post / location</label><input className={inputClass} placeholder="Front door, parking…" value={form.post} onChange={e => setForm({ ...form, post: e.target.value })} /></div>
          </div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Instructions (optional)</label><textarea rows={2} className={`${inputClass} resize-none`} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Check IDs, no re-entry after 11pm…" /></div>
          <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.send_text} onChange={e => setForm({ ...form, send_text: e.target.checked })} /> Text them their post and check-in link now</label>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button disabled={saving} className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} {saving ? 'Adding…' : 'Add guards'}
          </button>
        </form>
      </div>
    </div>
  )
}
