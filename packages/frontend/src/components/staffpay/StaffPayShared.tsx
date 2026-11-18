'use client'

import { useState } from 'react'
import api from '@/lib/api'
import { X, Loader2 } from 'lucide-react'

export type PayType = 'hourly' | 'flat'
export type Status = 'scheduled' | 'clocked_in' | 'submitted' | 'approved' | 'paid' | 'cancelled'

export interface Member {
  id: string
  name: string
  phone: string
  email: string | null
  job_title: string | null
  default_pay_type: PayType
  default_rate: number
  is_active: boolean
  ytd_earned: number
  payout_status: 'not_connected' | 'pending' | 'ready'
}


export interface Shift {
  id: string
  title: string
  shift_date: string
  start_time: string | null
  end_time: string | null
  pay_type: PayType
  rate: number
  status: Status
  clock_in_at: string | null
  clock_out_at: string | null
  worked_minutes: number | null
  approved_minutes: number | null
  amount: number | null
  needs_review: boolean
  clock_link: string
  staff_members: { id: string; name: string; phone: string; job_title: string | null } | null
  event: { id: string; name: string } | null
}

export interface EventOption { id: string; name: string; date?: string }

export const money = (n: number | null | undefined) => `$${Number(n ?? 0).toFixed(2)}`
export const hours = (m: number | null | undefined) => (m === null || m === undefined ? '' : `${(m / 60).toFixed(2)} h`)
export const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
export const fmtTime = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
export const errorText = (err: any, fallback: string) => {
  const detail = err?.response?.data?.message
  return Array.isArray(detail) ? detail.join(' ') : detail || fallback
}

export const STATUS_STYLE: Record<Status, string> = {
  scheduled: 'bg-gray-100 text-gray-700',
  clocked_in: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
}
export const STATUS_LABEL: Record<Status, string> = {
  scheduled: 'Scheduled',
  clocked_in: 'Working',
  submitted: 'Needs approval',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

export const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4" role="dialog" aria-label={title}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function PayFields({ payType, rate, onType, onRate, rateOptional }: { payType: PayType | ''; rate: string; onType: (t: any) => void; onRate: (r: string) => void; rateOptional?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Pay type</label>
        <select className={inputClass} value={payType} onChange={e => onType(e.target.value)}>
          {rateOptional && <option value="">Use their default</option>}
          <option value="hourly">Hourly</option>
          <option value="flat">Flat fee</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">{payType === 'flat' ? 'Flat fee ($)' : 'Rate ($/hr)'}</label>
        <input className={inputClass} inputMode="decimal" value={rate} onChange={e => onRate(e.target.value)} placeholder={rateOptional ? 'Their default' : '0.00'} />
      </div>
    </div>
  )
}


export interface FixedEvent { id: string; name: string; date?: string | null; startTime?: string | null; endTime?: string | null }

/** Schedules shifts. With fixedEvent the shift belongs to that event and starts from its date and times. */
export function ShiftModal({ members, events = [], fixedEvent, onClose, onDone }: { members: Member[]; events?: EventOption[]; fixedEvent?: FixedEvent; onClose: () => void; onDone: (text: string) => void }) {
  const [picked, setPicked] = useState<string[]>([])
  const [form, setForm] = useState({ title: '', shift_date: fixedEvent?.date ? String(fixedEvent.date).slice(0, 10) : new Date().toISOString().slice(0, 10), start_time: fixedEvent?.startTime ? String(fixedEvent.startTime).slice(0, 5) : '', end_time: fixedEvent?.endTime ? String(fixedEvent.endTime).slice(0, 5) : '', event_id: fixedEvent?.id ?? '', pay_type: '' as PayType | '', rate: '', send_link: true })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (picked.length === 0) { setError('Choose at least one person.'); return }
    setSaving(true)
    setError('')
    try {
      const res = await api.post<{ texted: boolean }[]>('/staff-pay/shifts', {
        staff_member_ids: picked,
        title: form.title,
        shift_date: form.shift_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        event_id: form.event_id || null,
        ...(form.pay_type ? { pay_type: form.pay_type } : {}),
        ...(form.rate !== '' ? { rate: Number(form.rate) } : {}),
        send_link: form.send_link,
      })
      const failed = res.data.filter(r => !r.texted).length
      onDone(
        !form.send_link
          ? `Scheduled ${res.data.length}. Use "Copy link" on each shift to share it.`
          : failed
            ? `Scheduled ${res.data.length}, but ${failed} text${failed === 1 ? '' : 's'} could not be sent. Use "Copy link" on those shifts.`
            : `Scheduled ${res.data.length} and texted the link${res.data.length === 1 ? '' : 's'}.`,
      )
    } catch (err) {
      setError(errorText(err, 'Could not schedule the shift. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={fixedEvent ? `Add staff to ${fixedEvent.name}` : 'Schedule a shift'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Who is working? *</label>
          <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100">
            {members.map(m => (
              <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={picked.includes(m.id)} onChange={e => setPicked(p => e.target.checked ? [...p, m.id] : p.filter(x => x !== m.id))} />
                <span className="flex-1">{m.name}{m.job_title && <span className="text-gray-400"> · {m.job_title}</span>}{m.payout_status !== 'ready' && <span className="ml-1 text-[10px] text-amber-700 bg-amber-50 rounded px-1">no bank yet</span>}</span>
                <span className="text-xs text-gray-400">{m.default_pay_type === 'hourly' ? `${money(m.default_rate)}/hr` : `${money(m.default_rate)} flat`}</span>
              </label>
            ))}
          </div>
        </div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">What is the shift? *</label><input className={inputClass} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Bar, setup, cleanup…" /></div>
        {!fixedEvent && <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Event (optional)</label>
          <select className={inputClass} value={form.event_id} onChange={e => setForm({ ...form, event_id: e.target.value })}>
            <option value="">No event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}{ev.date ? ` (${ev.date})` : ''}</option>)}
          </select>
        </div>}
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Date *</label><input type="date" required className={inputClass} value={form.shift_date} onChange={e => setForm({ ...form, shift_date: e.target.value })} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">Start</label><input type="time" className={inputClass} value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
          <div><label className="block text-xs font-medium text-gray-600 mb-1">End</label><input type="time" className={inputClass} value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
        </div>
        <PayFields rateOptional payType={form.pay_type} rate={form.rate} onType={t => setForm({ ...form, pay_type: t })} onRate={r => setForm({ ...form, rate: r })} />
        <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.send_link} onChange={e => setForm({ ...form, send_link: e.target.checked })} /> Text them their clock-in link now</label>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button disabled={saving} className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">{saving ? 'Scheduling…' : 'Schedule'}</button>
      </form>
    </Modal>
  )
}

export function ApproveModal({ shift, onClose, onDone }: { shift: Shift; onClose: () => void; onDone: () => void }) {
  const flat = shift.pay_type === 'flat'
  const [hoursText, setHoursText] = useState(shift.worked_minutes !== null && !shift.needs_review ? (shift.worked_minutes / 60).toFixed(2) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const minutes = Math.round(Number(hoursText) * 60)
  const amount = flat ? Number(shift.rate) : Number.isFinite(minutes) ? (Number(shift.rate) * minutes) / 60 : 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await api.post(`/staff-pay/shifts/${shift.id}/approve`, flat ? {} : { minutes })
      onDone()
    } catch (err) {
      setError(errorText(err, 'Could not approve. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={`Approve ${shift.staff_members?.name ?? 'shift'}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-sm text-gray-600">{shift.title} · {fmtDate(shift.shift_date)}</p>
        {flat ? (
          <p className="text-sm text-gray-700">Flat fee of <strong>{money(shift.rate)}</strong>, no hours needed.</p>
        ) : (
          <>
            {shift.clock_in_at && shift.clock_out_at && (
              <p className="text-xs text-gray-500">
                Clocked {new Date(shift.clock_in_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} to {new Date(shift.clock_out_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </p>
            )}
            {shift.needs_review && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">This ran over 16 hours, which usually means a missed clock-out. Enter the correct hours.</p>}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hours to pay</label>
              <input className={inputClass} inputMode="decimal" required value={hoursText} onChange={e => setHoursText(e.target.value)} placeholder="e.g. 5.5" />
              <p className="text-xs text-gray-400 mt-1">Edit this if the clock times are off.</p>
            </div>
            <p className="text-sm text-gray-700">{money(shift.rate)}/hr × {hoursText || 0} h = <strong>{money(amount)}</strong></p>
          </>
        )}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button disabled={saving} className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60">{saving ? 'Approving…' : `Approve ${money(amount)}`}</button>
      </form>
    </Modal>
  )
}

