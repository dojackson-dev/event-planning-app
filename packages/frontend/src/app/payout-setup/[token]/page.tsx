'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Loader2, AlertCircle, CheckCircle2, Landmark, ShieldCheck } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface SetupView {
  worker_first_name: string
  status: 'not_connected' | 'pending' | 'ready'
}

export default function PayoutSetupPage() {
  const { token } = useParams<{ token: string }>()
  const [view, setView] = useState<SetupView | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/staff-pay/public/payout-setup/${token}`)
      if (!res.ok) throw new Error()
      setView(await res.json())
    } catch {
      setLoadError('This link is not valid. Ask your manager to text it to you again.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  const start = async () => {
    setBusy(true)
    setActionError('')
    try {
      const res = await fetch(`${API_URL}/staff-pay/public/payout-setup/${token}/start`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.url) throw new Error(body.message || 'We could not open the setup page. Please try again.')
      window.location.href = body.url
    } catch (e) {
      setActionError((e as Error).message)
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

  if (loadError || !view) {
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
        <p className="text-sm text-gray-500 text-center mb-1">Hi {view.worker_first_name}</p>
        <h1 className="text-xl font-bold text-gray-900 text-center">Set up how you get paid</h1>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6 text-center" aria-live="polite">
          {view.status === 'ready' ? (
            <>
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">You are all set</p>
              <p className="text-sm text-gray-500 mt-1">Your pay will be sent to the account you added. You do not need to do anything else.</p>
            </>
          ) : (
            <>
              <Landmark className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-1">
                {view.status === 'pending'
                  ? 'Your setup is not finished yet. Pick up where you left off.'
                  : 'It takes about 3 minutes. You will add your bank or debit card so your pay can be sent to you.'}
              </p>
              <ul className="text-xs text-gray-500 text-left mt-4 mb-5 space-y-1.5">
                <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-green-600 shrink-0" /> Handled securely by Stripe. Your manager never sees your bank details.</li>
                <li className="flex gap-2"><ShieldCheck className="w-4 h-4 text-green-600 shrink-0" /> Stripe asks for your name, date of birth, address and SSN or tax ID, because you are paid as an independent worker and tax forms such as a 1099 may be filed for you.</li>
              </ul>
              <button
                onClick={start}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-lg py-4 rounded-xl disabled:opacity-60"
              >
                {busy && <Loader2 className="w-5 h-5 animate-spin" />} {view.status === 'pending' ? 'Continue setup' : 'Start setup'}
              </button>
            </>
          )}
          {actionError && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError}</p>}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">Powered by EventEcos and Stripe</p>
      </div>
    </div>
  )
}
