'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '@/lib/api'
import {
  Modal, PayFields, ShiftModal, ApproveModal,
  money, hours, fmtDate, fmtTime, errorText, STATUS_STYLE, STATUS_LABEL, inputClass,
  type PayType, type Status, type Member, type Shift, type EventOption,
} from '@/components/staffpay/StaffPayShared'
import { Plus, Loader2, X, Download, Send, Check, Copy, UserPlus, AlertTriangle, Users, Clock, Banknote, CreditCard, Landmark } from 'lucide-react'

interface PreviewWorker {
  staff_member_id: string
  name: string
  ready: boolean
  amount_cents: number
  shifts: { id: string; title: string; shift_date: string; amount_cents: number }[]
}

interface Quote { payroll_cents: number; service_fee_cents: number; processing_fee_cents: number; total_cents: number }

interface PayPreview {
  workers: PreviewWorker[]
  payable_cents: number
  waiting_cents: number
  quotes: { card: Quote | null; bank: Quote | null }
  open_payouts: { id: string; status: string; total_cents: number; created_at: string }[]
}

interface Payout {
  id: string
  status: 'pending_payment' | 'processing' | 'transferring' | 'completed' | 'needs_attention' | 'cancelled'
  pay_method: 'card' | 'bank'
  payroll_cents: number
  total_cents: number
  created_at: string
  staff_payout_items: { id: string; amount_cents: number; status: 'pending' | 'transferred' | 'failed'; error: string | null }[]
}


const cents = (c: number | null | undefined) => money(Number(c ?? 0) / 100)
const PAYOUT_LABEL: Record<Payout['status'], string> = {
  pending_payment: 'Waiting for your payment',
  processing: 'Bank payment clearing',
  transferring: 'Paying workers',
  completed: 'Workers paid',
  needs_attention: 'Needs attention',
  cancelled: 'Cancelled',
}
const PAYOUT_STYLE: Record<Payout['status'], string> = {
  pending_payment: 'bg-amber-100 text-amber-800',
  processing: 'bg-blue-100 text-blue-700',
  transferring: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  needs_attention: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function StaffPayPage() {
  const [tab, setTab] = useState<'shifts' | 'staff' | 'payments'>('shifts')
  const [preview, setPreview] = useState<PayPreview | null>(null)
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [payModal, setPayModal] = useState(false)
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
      const [m, s, pv, po] = await Promise.all([
        api.get<Member[]>('/staff-pay/members'),
        api.get<Shift[]>('/staff-pay/shifts'),
        api.get<PayPreview>('/staff-pay/payouts/preview'),
        api.get<Payout[]>('/staff-pay/payouts'),
      ])
      setMembers(m.data)
      setShifts(s.data)
      setPreview(pv.data)
      setPayouts(po.data)
      setLoadError('')
    } catch (err) {
      setLoadError(errorText(err, 'We could not load staff pay. Please refresh to try again.'))
    }
  }, [])

  useEffect(() => {
    load()
    const q = new URLSearchParams(window.location.search)
    if (q.get('paid')) setNotice('Payment received. Your workers are being paid now; this page updates as each transfer goes through.')
    else if (q.get('canceled')) setNotice('Payment canceled. Nothing was charged, and your approved shifts are still ready to pay.')
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
              <p className="text-2xl font-bold text-green-600">{cents(preview?.payable_cents ?? Math.round(approvedTotal * 100))}</p>
              {(preview?.waiting_cents ?? 0) > 0 && (
                <p className="text-xs text-amber-700">{cents(preview?.waiting_cents)} waiting on workers to connect a bank</p>
              )}
              <button
                onClick={() => setPayModal(true)}
                disabled={!preview || preview.payable_cents < 100}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40"
              >
                <Banknote className="w-3.5 h-3.5" /> Pay workers
              </button>
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
            {(['shifts', 'staff', 'payments'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                {t === 'shifts' ? 'Shifts' : t === 'staff' ? `Staff (${members?.length ?? 0})` : 'Payments'}
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
                            {s.event && ` · ${s.event.name}`}
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
                    <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Phone</th><th className="px-4 py-2">Default pay</th><th className="px-4 py-2">Bank</th><th className="px-4 py-2 text-right">Earned this year</th><th className="px-4 py-2" /></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(members ?? []).map(m => (
                      <tr key={m.id} className={m.is_active ? '' : 'opacity-50'}>
                        <td className="px-4 py-2"><p className="font-medium text-gray-900">{m.name}</p>{m.job_title && <p className="text-xs text-gray-500">{m.job_title}</p>}</td>
                        <td className="px-4 py-2 text-gray-600">{m.phone}</td>
                        <td className="px-4 py-2 text-gray-600">{m.default_pay_type === 'hourly' ? `${money(m.default_rate)}/hr` : `${money(m.default_rate)} flat`}</td>
                        <td className="px-4 py-2">
                          {m.payout_status === 'ready' ? (
                            <span className="text-xs font-medium text-green-700 bg-green-50 rounded-full px-2 py-0.5">Ready to be paid</span>
                          ) : (
                            <button
                              onClick={() => act(async () => { const r = await api.post(`/staff-pay/members/${m.id}/payout-setup`); if (!r.data.texted) throw { response: { data: { message: 'The text could not be sent. Ask them to open this link: ' + r.data.link } } } }, 'Setup link texted.')}
                              className="text-xs text-primary-600 hover:underline"
                            >
                              {m.payout_status === 'pending' ? 'Setup unfinished · text link again' : 'Text bank setup link'}
                            </button>
                          )}
                        </td>
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

      {tab === 'payments' && (
        payouts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
            <Banknote className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No payments yet</p>
            <p className="text-sm text-gray-400 mt-1">Approved shifts can be paid with one payment. Workers receive their share automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payouts.map(po => {
              const failed = po.staff_payout_items.filter(i => i.status === 'failed')
              return (
                <div key={po.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{cents(po.payroll_cents)} to {po.staff_payout_items.length} shift{po.staff_payout_items.length === 1 ? '' : 's'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(po.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · you paid {cents(po.total_cents)} by {po.pay_method === 'bank' ? 'bank account' : 'card'}
                      </p>
                    </div>
                    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${PAYOUT_STYLE[po.status]}`}>{PAYOUT_LABEL[po.status]}</span>
                  </div>
                  {failed.length > 0 && (
                    <p className="mt-2 text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">
                      {failed.length} transfer{failed.length === 1 ? '' : 's'} did not go through ({failed[0].error ?? 'unknown reason'}). Your payment is safe; retry once the worker&apos;s account is fixed.
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    {po.status === 'needs_attention' && (
                      <button onClick={() => act(() => api.post(`/staff-pay/payouts/${po.id}/retry`), 'Retried.')} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs hover:bg-gray-700">Retry failed transfers</button>
                    )}
                    {po.status === 'pending_payment' && (
                      <button onClick={() => act(() => api.post(`/staff-pay/payouts/${po.id}/cancel`), 'Payment canceled.')} className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50">Cancel this payment</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {payModal && preview && (
        <PayModal preview={preview} onClose={() => setPayModal(false)} onResend={(id) => act(async () => { const r = await api.post(`/staff-pay/members/${id}/payout-setup`); if (!r.data.texted) throw { response: { data: { message: 'The text could not be sent. Ask them to open this link: ' + r.data.link } } } }, 'Setup link texted.')} />
      )}
      {shiftModal && members && (
        <ShiftModal members={members.filter(m => m.is_active)} events={events} onClose={() => setShiftModal(false)} onDone={(text) => { setShiftModal(false); flash(text); load() }} />
      )}
      {memberModal && <MemberModal initial={memberModal} onClose={() => setMemberModal(null)} onDone={(text) => { setMemberModal(null); flash(text); load() }} />}
      {approving && <ApproveModal shift={approving} onClose={() => setApproving(null)} onDone={() => { setApproving(null); flash('Approved.'); load() }} />}
    </div>
  )
}

function MemberModal({ initial, onClose, onDone }: { initial: Partial<Member>; onClose: () => void; onDone: (text: string) => void }) {
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
      if (initial.id) {
        await api.put(`/staff-pay/members/${initial.id}`, payload)
        onDone('Saved.')
        return
      }
      const created = await api.post<{ setup_texted: boolean }>('/staff-pay/members', payload)
      onDone(created.data.setup_texted
        ? `Saved. ${form.name.split(' ')[0]} was texted a link to sign up with Stripe so they can receive pay.`
        : 'Saved, but the sign-up text could not be sent. Use "Text bank setup link" on the Staff tab.')
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
        {!initial.id && (
          <p className="text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            We will text them a link to sign up with Stripe so they can receive pay. It takes about 3 minutes, and you never see their bank details.
          </p>
        )}
        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button disabled={saving} className="w-full py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60">{saving ? 'Saving…' : initial.id ? 'Save' : 'Add and text sign-up link'}</button>
      </form>
    </Modal>
  )
}

function PayModal({ preview, onClose, onResend }: { preview: PayPreview; onClose: () => void; onResend: (memberId: string) => void }) {
  const [method, setMethod] = useState<'card' | 'bank'>('card')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const quote = preview.quotes[method] ?? preview.quotes.card
  const ready = preview.workers.filter(w => w.ready)
  const waiting = preview.workers.filter(w => !w.ready)

  const pay = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.post<{ url: string }>('/staff-pay/payouts/checkout', { method })
      window.location.href = res.data.url
    } catch (err) {
      setError(errorText(err, 'We could not start the payment. Nothing was charged.'))
      setBusy(false)
    }
  }

  return (
    <Modal title="Pay your workers" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Paying now</p>
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
            {ready.map(w => (
              <div key={w.staff_member_id} className="flex items-center justify-between px-3 py-2 text-sm">
                <span>{w.name} <span className="text-xs text-gray-400">· {w.shifts.length} shift{w.shifts.length === 1 ? '' : 's'}</span></span>
                <span className="font-medium">{cents(w.amount_cents)}</span>
              </div>
            ))}
          </div>
        </div>

        {waiting.length > 0 && (
          <div>
            <p className="text-xs font-medium text-amber-700 mb-1">Not included: they have not connected a bank yet</p>
            <div className="border border-amber-200 bg-amber-50 rounded-lg divide-y divide-amber-100">
              {waiting.map(w => (
                <div key={w.staff_member_id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{w.name} <span className="text-xs text-gray-500">· {cents(w.amount_cents)}</span></span>
                  <button onClick={() => onResend(w.staff_member_id)} className="text-xs text-primary-700 hover:underline">Text setup link</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {quote && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMethod('card')} className={`flex items-center justify-center gap-2 border rounded-lg py-2 text-sm ${method === 'card' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-300'}`}><CreditCard className="w-4 h-4" /> Card</button>
              <button type="button" onClick={() => setMethod('bank')} disabled={!preview.quotes.bank} title={preview.quotes.bank ? '' : 'Bank payment is not turned on for your account'} className={`flex items-center justify-center gap-2 border rounded-lg py-2 text-sm disabled:opacity-40 ${method === 'bank' ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-gray-300'}`}><Landmark className="w-4 h-4" /> Bank account</button>
            </div>
            <div className="text-sm space-y-1 border-t border-gray-100 pt-3">
              <div className="flex justify-between"><span className="text-gray-600">Staff pay</span><span>{cents(quote.payroll_cents)}</span></div>
              {quote.service_fee_cents > 0 && <div className="flex justify-between"><span className="text-gray-600">EventEcos service fee</span><span>{cents(quote.service_fee_cents)}</span></div>}
              <div className="flex justify-between"><span className="text-gray-600">Payment processing</span><span>{cents(quote.processing_fee_cents)}</span></div>
              <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100"><span>You pay</span><span>{cents(quote.total_cents)}</span></div>
            </div>
            <p className="text-xs text-gray-500">
              Workers receive the full amounts above, sent to their bank on Stripe&apos;s normal schedule. Bank payments take a few days to clear before workers are paid.
            </p>
          </>
        )}

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        <button onClick={pay} disabled={busy || !quote} className="w-full py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {quote ? `Pay ${cents(quote.total_cents)}` : 'Nothing to pay'}
        </button>
      </div>
    </Modal>
  )
}
