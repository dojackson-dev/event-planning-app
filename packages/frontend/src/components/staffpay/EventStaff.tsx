'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Plus, Loader2, Send, Copy, Check, Users, AlertTriangle } from 'lucide-react'
import {
  ShiftModal, ApproveModal, money, hours, fmtDate, fmtTime, errorText, STATUS_STYLE, STATUS_LABEL,
  type Member, type Shift, type FixedEvent,
} from '@/components/staffpay/StaffPayShared'

/** Who is working an event (besides security), with hours, pay and approval, like the Security panel. */
export default function EventStaff({ event }: { event: FixedEvent }) {
  const [shifts, setShifts] = useState<Shift[] | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [adding, setAdding] = useState(false)
  const [approving, setApproving] = useState<Shift | null>(null)

  const load = useCallback(async () => {
    try {
      const [s, m, g] = await Promise.all([
        api.get<Shift[]>('/staff-pay/shifts', { params: { event_id: event.id } }),
        api.get<Member[]>('/staff-pay/members'),
        // Paid guards also have shifts; they are managed in the Security panel, so leave them out here.
        api.get<{ guards: { shift: { id: string } | null }[] }>(`/security/event/${event.id}/guards`).catch(() => null),
      ])
      const guardShifts = new Set((g?.data.guards ?? []).map(x => x.shift?.id).filter(Boolean))
      setShifts(s.data.filter(x => x.status !== 'cancelled' && !guardShifts.has(x.id)))
      setMembers(m.data)
      setError('')
    } catch (err) {
      setError(errorText(err, 'We could not load the staff for this event. Please refresh to try again.'))
    }
  }, [event.id])

  useEffect(() => { load() }, [load])

  const flash = (t: string) => { setNotice(t); setTimeout(() => setNotice(''), 5000) }
  const act = async (fn: () => Promise<any>, ok: string) => {
    try { await fn(); flash(ok); await load() } catch (err) { flash(errorText(err, 'That did not work. Please try again.')) }
  }

  const list = shifts ?? []
  const working = list.filter(s => s.status === 'clocked_in').length
  const toApprove = list.filter(s => s.status === 'submitted').length
  const cost = list.reduce((sum, s) => sum + Number(s.amount ?? 0), 0)
  const active = members.filter(m => m.is_active)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-700">
          <strong>{list.length}</strong> staff scheduled
          {working > 0 && <> · <span className="text-blue-700">{working} working now</span></>}
          {toApprove > 0 && <span className="ml-2 text-xs font-medium text-amber-800 bg-amber-50 rounded-full px-2 py-0.5">{toApprove} to approve</span>}
          {list.length > 0 && <> · about {money(cost)}</>}
        </p>
        <div className="flex gap-2">
          <Link href="/dashboard/staff-pay" className="text-xs text-primary-600 hover:underline self-center">Open Staff Pay</Link>
          <button type="button" onClick={() => setAdding(true)} disabled={active.length === 0} title={active.length === 0 ? 'Add people to your staff list first' : ''} className="inline-flex items-center gap-1.5 text-xs bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50">
            <Plus className="w-3.5 h-3.5" /> Add staff
          </button>
        </div>
      </div>

      {notice && <div className="text-xs rounded-lg bg-blue-50 border border-blue-200 text-blue-800 px-3 py-2" role="status">{notice}</div>}
      {error && <div className="text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2">{error}</div>}

      {shifts === null && !error ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary-600" /></div>
      ) : list.length === 0 && !error ? (
        <div className="text-center text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg py-6">
          <Users className="w-7 h-7 mx-auto mb-2 opacity-30" />
          {active.length === 0
            ? <>No staff yet. <Link href="/dashboard/staff-pay" className="text-primary-600 hover:underline">Add your staff</Link> first, then assign them to events here.</>
            : 'No staff on this event yet. Add them and each is texted a link to clock in and out.'}
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
          {list.map(s => (
            <li key={s.id} className="px-3 py-2.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.staff_members?.name ?? 'Staff'} <span className="font-normal text-gray-500">· {s.title}</span></p>
                  <p className="text-xs text-gray-500">
                    {fmtDate(s.shift_date)}{s.start_time && ` · ${fmtTime(s.start_time)}`}{s.end_time && ` – ${fmtTime(s.end_time)}`}
                    {' · '}{s.pay_type === 'hourly' ? `${money(s.rate)}/hr` : `${money(s.rate)} flat`}
                    {s.pay_type === 'hourly' && s.worked_minutes !== null && ` · worked ${hours(s.worked_minutes)}`}
                    {s.amount !== null && ` · ${money(s.amount)}`}
                  </p>
                  {s.needs_review && <p className="text-xs text-amber-700 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Over 16 hours: check for a missed clock-out</p>}
                </div>
                <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_STYLE[s.status]}`}>{STATUS_LABEL[s.status]}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(s.status === 'submitted' || (s.pay_type === 'flat' && (s.status === 'scheduled' || s.status === 'clocked_in'))) && (
                  <button type="button" onClick={() => setApproving(s)} className="inline-flex items-center gap-1 text-xs text-green-700 hover:bg-green-50 rounded px-2 py-1"><Check className="w-3 h-3" /> Review &amp; approve</button>
                )}
                {(s.status === 'scheduled' || s.status === 'clocked_in') && (
                  <>
                    <button type="button" onClick={() => act(async () => { const r = await api.post(`/staff-pay/shifts/${s.id}/send-link`); if (!r.data.texted) throw { response: { data: { message: 'The text could not be sent. Copy the link and share it directly.' } } } }, 'Text sent.')} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1"><Send className="w-3 h-3" /> Text link again</button>
                    <button type="button" onClick={() => { navigator.clipboard.writeText(s.clock_link); flash('Link copied.') }} className="inline-flex items-center gap-1 text-xs text-gray-600 hover:bg-gray-100 rounded px-2 py-1"><Copy className="w-3 h-3" /> Copy link</button>
                  </>
                )}
                {['scheduled', 'clocked_in', 'submitted'].includes(s.status) && (
                  <button type="button" onClick={() => { if (confirm(`Remove ${s.staff_members?.name ?? 'this person'} from this event?`)) act(() => api.post(`/staff-pay/shifts/${s.id}/cancel`), 'Removed from the event.') }} className="text-xs text-red-600 hover:bg-red-50 rounded px-2 py-1">Remove</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && <ShiftModal members={active} fixedEvent={event} onClose={() => setAdding(false)} onDone={(t) => { setAdding(false); flash(t); load() }} />}
      {approving && <ApproveModal shift={approving} onClose={() => setApproving(null)} onDone={() => { setApproving(null); flash('Approved.'); load() }} />}
    </div>
  )
}
