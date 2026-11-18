'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, ShieldCheck, MapPin, Clock } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Assignment {
  guard_first_name: string
  event_name: string
  event_date: string | null
  report_time: string | null
  post: string | null
  notes: string | null
  arrived: boolean
  arrival_time: string | null
  paid: boolean
  left: boolean
  left_time: string | null
}

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const fmtTime = (t: string | null) => {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}
const fmtStamp = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

export default function SecurityCheckInPage() {
  const { token } = useParams<{ token: string }>()
  const [a, setA] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/security/public/check-in/${token}`)
      if (!res.ok) throw new Error()
      setA(await res.json())
    } catch {
      setLoadError('This link is not valid. Ask your manager to text it to you again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const arrive = async (action: 'arrive' | 'leave' = 'arrive') => {
    setBusy(true)
    setActionError('')
    try {
      const res = await fetch(`${API_URL}/security/public/check-in/${token}/${action}`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || 'That did not work. Please try again.')
      setA(body)
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

  if (loadError || !a) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <p className="text-gray-700">{loadError || 'Something went wrong.'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-sm mx-auto">
        <p className="text-sm text-gray-500 text-center mb-1">Hi {a.guard_first_name}</p>
        <h1 className="text-xl font-bold text-gray-900 text-center">Security: {a.event_name}</h1>
        {a.event_date && <p className="text-center text-sm text-gray-500 mt-1">{fmtDate(a.event_date)}</p>}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6" aria-live="polite">
          <div className="space-y-2 text-sm text-gray-700 mb-5">
            {a.report_time && <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" /> Report at <strong>{fmtTime(a.report_time)}</strong></p>}
            {a.post && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" /> Your post: <strong>{a.post}</strong></p>}
            {a.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{a.notes}</p>}
          </div>

          {a.arrived ? (
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">{a.left ? 'Thanks, your hours were sent' : 'You are checked in'}</p>
              {a.arrival_time && <p className="text-sm text-gray-500">Arrived at {fmtStamp(a.arrival_time)}{a.left && a.left_time ? ` · left at ${fmtStamp(a.left_time)}` : ''}</p>}
              {a.left && <p className="text-xs text-gray-400 mt-2">Your manager approves your hours before you are paid.</p>}
              {a.paid && !a.left && (
                <button
                  onClick={() => arrive('leave')}
                  disabled={busy}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-lg py-4 rounded-xl disabled:opacity-60"
                >
                  {busy && <Loader2 className="w-5 h-5 animate-spin" />} I am leaving (end my shift)
                </button>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 text-center mb-3">Tap when you arrive so your manager knows you are on site.</p>
              <button
                onClick={() => arrive('arrive')}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg py-4 rounded-xl disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />} I have arrived
              </button>
            </>
          )}
          {actionError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 text-center">{actionError}</p>}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">Powered by EventEcos</p>
      </div>
    </div>
  )
}
