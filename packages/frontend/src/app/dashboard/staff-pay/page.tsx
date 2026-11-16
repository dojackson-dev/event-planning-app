'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import { Plus, Loader2, X, Download, Send, Check, Copy, UserPlus, AlertTriangle, Users, Clock } from 'lucide-react'

type PayType = 'hourly' | 'flat'
type Status = 'scheduled' | 'clocked_in' | 'submitted' | 'approved' | 'paid' | 'cancelled'

interface Member {
  id: string
  name: string
  phone: string
  email: string | null
  job_title: string | null
  default_pay_type: PayType
  default_rate: number
  is_active: boolean
  ytd_earned: number
}

interface Shift {
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
  events: { id: string; name: string } | null
}

interface EventOption { id: string; name: string; date?: string }

const money = (n: number | null | undefined) => `$${Number(n ?? 0).toFixed(2)}`
const hours = (m: number | null | undefined) => (m === null || m === undefined ? '' : `${(m / 60).toFixed(2)} h`)
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const fmtTime = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const errorText = (err: any, fallback: string) => {
  const detail = err?.response?.data?.message
  return Array.isArray(detail) ? detail.join(' ') : detail || fallback
}

const STATUS_STYLE: Record<Status, string> = {
  scheduled: 'bg-gray-100 text-gray-700',
  clocked_in: 'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-700',
  paid: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-gray-100 text-gray-400 line-through',
}
const STATUS_LABEL: Record<Status, string> = {
  scheduled: 'Scheduled',
  clocked_in: 'Working',
  submitted: 'Needs approval',
  approved: 'Approved',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

const inputClass = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'

export default function StaffPayPage() {
  const [tab, setTab] = useState<'shifts' | 'staff'>('shifts')
  const [members, setMembers] = useState<Member[] | null>(null)
  const [shifts, setShifts] = useState<Shift[] | null>(null)
  const [events, setEvents] = useState<EventOption[]>([])
  const [loadError, setLoadError] = useState('')
  const [notice, setNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [shiftModal, setShiftModal] = useState(false)
  const [memberModal, setMemberModal] = useState<Partial<Member> | null>(null)
  const [approving, setApproving] = useState<Shift | null>(null)
  const [exportFrom, setExportFrom] = useState(() => `${new Date().getFullYear()}-01-01`)
  const [exportTo, setExportTo] = useState(() => new Date().toISOString().slice(0, 10))
  const [exporting, setExporting] = useState(false)

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([api.get<Member[]>('/staff-pay/members'), api.get<Shift[]>('/staff-pay/shifts')])
      setMembers(m.data)
      setShifts(s.data)
      setLoadError('')
    } catch (err) {
      setLoadError(errorText(err, 'We could not load staff pay. Please refresh to try again.'))
    }
  }, [])

  useEffect(() => {
    load()
    api.get('/events').then(r => setEvents((r.data ?? []).filter((e: any) => e.status !== 'cancelled'))).catch(() => {})
  }, [load])

  const flash = (text: string) => {
    setNotice(text)
    setTimeout(() => setNotice(''), 5000)
  }

  const visible = useMemo(
    () => (shifts ?? []).filter(s => !statusFilter || s.status === statusFilter),
    [shifts, statusFilter],
  )
  const awaiting = (shifts ?? []).filter(s => s.status === 'submitted')
  const approvedTotal = (shifts ?? []).filter(s => s.status === 'approved').reduce((sum, s) => sum + Number(s.amount ?? 0), 0)

  const act = async (fn: () => Promise<any>, ok: string) => {
    try {
      await fn()
      flash(ok)
      await load()
    } catch (err) {
      flash(errorText(err, 'That did not work. Please try again.'))
    }
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await api.get('/staff-pay/export.csv', { params: { from: exportFrom, to: exportTo }, responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = `staff-pay-${exportFrom}-to-${exportTo}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      flash(errorText(err, 'The export failed. Please try again.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Clock className="w-6 h-6 text-primary-600" /> Staff Pay</h1>
          <p className="text-sm text-gray-500 mt-1">Schedule staff, collect hours by text link, approve them, then export or pay.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setMemberModal({ default_pay_type: 'hourly', default_rate: 0 })} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
            <UserPlus className="w-4 h-4" /> Add staff
          </button>
          <button onClick={() => setShiftModal(true)} disabled={!members?.some(m => m.is_active)} className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Schedule shift
          </button>
        </div>
      </div>

      {notice && <div className="mb-4 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm px-4 py-2" role="status">{notice}</div>}
      {loadError && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">{loadError}</div>}

      {members === null && !loadError ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Waiting for your approval</p>
              <p className="text-2xl font-bold text-amber-600">{awaiting.length}</p>
              <p className="text-xs text-gray-400">{money(awaiting.reduce((s, x) => s + Number(x.amount ?? 0), 0))} estimated</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Approved, ready to pay</p>
              <p className="text-2xl font-bold text-green-600">{money(approvedTotal)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500 mb-2">Export approved shifts (CSV)</p>
              <div className="flex items-center gap-1.5">
                <input type="date" value={exportFrom} onChange={e => setExportFrom(e.target.value)} className="border border-gray-300 rounded-md px-1.5 py-1 text-xs w-full min-w-0" aria-label="From date" />
                <input type="date" value={exportTo} onChange={e => setExportTo(e.target.value)} className="border border-gray-300 rounded-md px-1.5 py-1 text-xs w-full min-w-0" aria-label="To date" />
                <button onClick={exportCsv} disabled={exporting} className="p-2 bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-60 shrink-0" aria-label="Download CSV">
                  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-1 border-b border-gray-200 mb-4">
            {(['shifts', 'staff'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'shifts' ? 'Shifts' : `Staff (${members?.length ?? 0})`}
              </button>
            ))}
          </div>

          {tab === 'shifts' && (
            <>
              <div className="mb-3">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm" aria-label="Filter by status">
                  <option value="">All shifts</option>
                  {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
              {visible.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                  <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">{shifts?.length ? 'No shifts match that filter' : 'No shifts yet'}</p>
                  <p className="text-sm text-gray-400 mt-1">{members?.length ? 'Schedule a shift and the worker gets a text link to clock in.' : 'Add your staff first, then schedule shifts.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visible.map(s => (
                    <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">{s.staff_members?.name ?? 'Staff'} <span className="font-normal text-gray-500">· {s.title}</span></p>
                          <p className="text-xs text-gray-500">
                            {fmtDate(s.shift_date)}{s.start_time && ` · ${fmtTime(s.start_time)}`}{s.end_time && ` – ${fmtTime(s.end_time)}`}
                            {s.events && ` · ${s.events.name}`}
                          </p>
                        </div>
                        <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_STYLE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-gray-600">
                        <span>{s.pay_type === 'hourly' ? `${money(s.rate)}/hr` : `${money(s.rate)} flat`}</span>
                        {s.pay_type === 'hourly' && s.worked_minutes !== null && <span>Worked {hours(s.worked_minutes)}</span>}
                        {s.amount !== null && <span className="font-semibold text-gray-900">{money(s.amount)}</span>}
                        {s.needs_review && <span className="inline-flex items-center gap-1 text-amber-700 text-xs"><AlertTriangle className="w-3.5 h-3.5" /> Over 16 hours: check for a missed clock-out</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(s.status === 'submitted' || (s.pay_type === 'flat' && (s.status === 'scheduled' || s.status === 'clocked_in'))) && (
                          <button onClick={() => setApproving(s)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"><Check className="w-3.5 h-3.5" /> Review &amp; approve</button>
                        )}
                        {(s.status === 'scheduled' || s.status === 'clocked_in') && (
                          <>
                            <button onClick={() => act(async () => { const r = await api.post(`/staff-pay/shifts/${s.id}/send-link`); if (!r.data.texted) throw { response: { data: { message: 'The text could not be sent. Copy the link and share it directly.' } } } }, 'Text sent.')} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"><Send className="w-3.5 h-3.5" /> Text link again</button>
                            <button onClick={() => { navigator.clipboard.writeText(s.clock_link); flash('Link copied.') }} className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50"><Copy className="w-3.5 h-3.5" /> Copy link</button>
                          </>
                        )}
                        {['scheduled', 'clocked_in', 'submitted'].includes(s.status) && (
                          <button onClick={() => { if (confirm('Cancel this shift?')) act(() => api.post(`/staff-pay/shifts/${s.id}/cancel`), 'Shift cancelled.') }} className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg">Cancel shift</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'staff' && (
            (members ?? []).length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No staff yet</p>
                <p className="text-sm text-gray-400 mt-1">Add each person with a mobile number. They do not need an account.</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 text-left">
                    <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Default pay</th><th className="px-4 py-2 text-right">Earned this year</th><th className="px-4 py-2" /></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(members ?? []).map(m => (
                      <tr key={m.id} className={m.is_active ? '' : 'opacity-50'}>
                        <td className="px-4 py-2"><p className="font-medium text-gray-900">{m.name}</p>{m.job_title && <p className="text-xs text-gray-500">{m.job_title}</p>}</td>
                        <td className="px-4 py-2 text-gray-600">{m.phone}</td>
                        <td className="px-4 py-2 text-gray-600">{m.default_pay_type === 'hourly' ? `${money(m.default_rate)}/hr` : `${money(m.default_rate)} flat`}</td>
                        <td className="px-4 py-2 text-right font-medium">{money(m.ytd_earned)}</td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                          <button onClick={() => setMemberModal(m)} className="text-xs text-primary-600 hover:underline mr-3">Edit</button>
                          <button onClick={() => act(() => api.put(`/staff-pay/members/${m.id}`, { is_active: !m.is_active }), m.is_active ? 'Marked inactive.' : 'Reactivated.')} className="text-xs text-gray-500 hover:underline">{m.is_active ? 'Deactivate' : 'Reactivate'}</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}

      {shiftModal && members && (
        <ShiftModal members={members.filter(m => m.is_active)} events={events} onClose={() => setShiftModal(false)} onDone={(text) => { setShiftModal(false); flash(text); load() }} />
      )}
      {memberModal && <MemberModal initial={memberModal} onClose={() => setMemberModal(null)} onDone={() => { setMemberModal(null); flash('Saved.'); load() }} />}
      {approving && <ApproveModal shift={approving} onClose={() => setApproving(null)} onDone={() => { setApproving(null); flash('Approved.'); load() }} />}
    </div>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
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

function PayFields({ payType, rate, onType, onRate, rateOptional }: { payType: PayType | ''; rate: string; onType: (t: any) => void; onRate: (r: string) => void; rateOptional?: boolean }) {
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

function MemberModal({ initial, onClose, onDone }: { initial: Partial<Member>; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    name: initial.name ?? '',
    phone: initial.phone ?? '',
    email: initial.email ?? '',
    job_title: initial.job_title ?? '',
    default_pay_type: (initial.default_pay_type ?? 'hourly') as PayType,
    default_rate: String(initial.default_rate ?? ''),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, default_rate: form.default_rate === '' ? 0 : Number(form.default_rate) }
    try {
      if (initial.id) await api.put(`/staff-pay/members/${initial.id}`, payload)
      else await api.post('/staff-pay/members', payload)
      onDone()
    } catch (err) {
      setError(errorText(err, 'Could not save. Please try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={initial.id ? 'Edit staff member' : 'Add staff member'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Name *</label><input className={inputClass} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Mobile number * <span className="text-gray-400">(shift links are texted here)</span></label><input className={inputClass} required type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000 0000" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Job title</label><input className={inputClass} value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} placeholder="Bartender, setup crew…" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Email (optional)</label><input className={inputClass} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <PayFields payType={form.default_pay_type} rate={form.default_rate} onType={t => setForm({ ...form, default_pay_type: t })} onRate={r => setForm({ ...form, default_rate: r })} />
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button disabled={saving} className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
      </form>
    </Modal>
  )
}

function ShiftModal({ members, events, onClose, onDone }: { members: Member[]; events: EventOption[]; onClose: () => void; onDone: (text: string) => void }) {
  const [picked, setPicked] = useState<string[]>([])
  const [form, setForm] = useState({ title: '', shift_date: new Date().toISOString().slice(0, 10), start_time: '', end_time: '', event_id: '', pay_type: '' as PayType | '', rate: '', send_link: true })
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
    <Modal title="Schedule a shift" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Who is working? *</label>
          <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100">
            {members.map(m => (
              <label key={m.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={picked.includes(m.id)} onChange={e => setPicked(p => e.target.checked ? [...p, m.id] : p.filter(x => x !== m.id))} />
                <span className="flex-1">{m.name}{m.job_title && <span className="text-gray-400"> · {m.job_title}</span>}</span>
                <span className="text-xs text-gray-400">{m.default_pay_type === 'hourly' ? `${money(m.default_rate)}/hr` : `${money(m.default_rate)} flat`}</span>
              </label>
            ))}
          </div>
        </div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">What is the shift? *</label><input className={inputClass} required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Bar, setup, cleanup…" /></div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Event (optional)</label>
          <select className={inputClass} value={form.event_id} onChange={e => setForm({ ...form, event_id: e.target.value })}>
            <option value="">No event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}{ev.date ? ` (${ev.date})` : ''}</option>)}
          </select>
        </div>
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

function ApproveModal({ shift, onClose, onDone }: { shift: Shift; onClose: () => void; onDone: () => void }) {
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
