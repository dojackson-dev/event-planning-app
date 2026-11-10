'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import api from '@/lib/api'

function UnsubscribeForm() {
  const params = useSearchParams()
  const email = params.get('e') ?? ''
  const token = params.get('t') ?? ''
  const [state, setState] = useState<'idle' | 'working' | 'done' | 'error'>('idle')

  const confirmUnsubscribe = async () => {
    setState('working')
    try {
      await api.post('/outreach/unsubscribe', { email, token })
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (!email || !token) {
    return <p role="alert" className="text-sm text-gray-600">This unsubscribe link is not valid. Please use the link in your email.</p>
  }

  if (state === 'done') {
    return (
      <div className="text-center" aria-live="polite">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-600" aria-hidden="true" />
        <h1 className="text-xl font-semibold text-gray-900">You are unsubscribed</h1>
        <p className="mt-2 text-sm text-gray-600">{email} will no longer receive sales emails from EventEcos.</p>
      </div>
    )
  }

  return (
    <div className="text-center">
      <h1 className="text-xl font-semibold text-gray-900">Unsubscribe from EventEcos emails</h1>
      <p className="mt-2 text-sm text-gray-600">Stop sales emails to <strong className="break-all">{email}</strong>?</p>
      {state === 'error' && <p role="alert" className="mt-3 text-sm text-red-600">That did not work. The link may be out of date, or please try again.</p>}
      <button
        type="button"
        onClick={confirmUnsubscribe}
        disabled={state === 'working'}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60"
      >
        {state === 'working' && <Loader2 className="h-4 w-4 animate-spin" />} Unsubscribe
      </button>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm">
        <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin text-gray-400" aria-label="Loading" />}>
          <UnsubscribeForm />
        </Suspense>
      </div>
    </main>
  )
}
