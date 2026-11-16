'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, Clock, LogIn, LogOut } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface PublicShift {
  worker_first_name: string
  title: string
  event_name: string | null
  shift_date: string
  start_time: string | null
  end_time: string | null
  status: 'scheduled' | 'clocked_in' | 'submitted' | 'approved' | 'paid' | 'cancelled'
  clock_in_at: string | null
  clock_out_at: string | null
}

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const fmtTime = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const fmtStamp = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export default function ClockPage() {
  const { token } = useParams<{ token: string }>()
  const [shift, setShift] = useState<PublicShift | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/staff-pay/public/shift/${token}`)
      if (!res.ok) throw new Error()
      setShift(await res.json())
    } catch {
      setLoadError('This link is not valid. Ask your manager to text it to you again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const act = async (action: 'clock-in' | 'clock-out') => {
    setBusy(true)
    setActionError('')
    try {
      const res = await fetch(`${API_URL}/staff-pay/public/shift/${token}/${action}`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || 'That did not work. Please try again.')
      setShift(body)
    } catch (e) {
      setActionError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (loadError || !shift) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700">{loadError || 'Something went wrong.'}</p>
        </div>
      </div>
    )
  }

  const done = ['submitted', 'approved', 'paid'].includes(shift.status)

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-sm mx-auto">
        <p className="text-sm text-gray-500 text-center mb-1">Hi {shift.worker_first_name}</p>
        <h1 className="text-xl font-bold text-gray-900 text-center">{shift.title}</h1>
        {shift.event_name && <p className="text-center text-gray-600">{shift.event_name}</p>}
        <p className="text-center text-sm text-gray-500 mt-1">
          {fmtDate(shift.shift_date)}
          {shift.start_time && ` · ${fmtTime(shift.start_time)}`}
          {shift.end_time && ` – ${fmtTime(shift.end_time)}`}
        </p>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6 text-center" aria-live="polite">
          {shift.status === 'cancelled' && (
            <>
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">This shift was cancelled</p>
              <p className="text-sm text-gray-500 mt-1">Check with your manager if you think that is a mistake.</p>
            </>
          )}

          {shift.status === 'scheduled' && (
            <>
              <Clock className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">Tap when you arrive and start working.</p>
              <button
                onClick={() => act('clock-in')}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg py-4 rounded-xl disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />} Clock in
              </button>
            </>
          )}

          {shift.status === 'clocked_in' && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">You are clocked in</p>
              {shift.clock_in_at && <p className="text-sm text-gray-500 mb-4">Since {fmtStamp(shift.clock_in_at)}</p>}
              <button
                onClick={() => act('clock-out')}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-lg py-4 rounded-xl disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogOut className="w-5 h-5" />} Clock out
              </button>
            </>
          )}

          {done && (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">
                {shift.status === 'submitted' ? 'Thanks, your hours were sent' : shift.status === 'approved' ? 'Your hours were approved' : 'You were paid for this shift'}
              </p>
              {shift.clock_in_at && shift.clock_out_at && (
                <p className="text-sm text-gray-500 mt-1">
                  {fmtStamp(shift.clock_in_at)} – {fmtStamp(shift.clock_out_at)}
                </p>
              )}
              {shift.status === 'submitted' && <p className="text-xs text-gray-400 mt-3">Your manager reviews and approves hours before payment.</p>}
            </>
          )}

          {actionError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError}</p>}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">Powered by EventEcos</p>
      </div>
    </div>
  )
}
