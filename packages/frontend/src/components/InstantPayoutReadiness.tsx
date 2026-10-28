'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, CheckCircle, CreditCard, ExternalLink, Info, Loader2, Zap } from 'lucide-react'
import api from '@/lib/api'

type Role = 'owner' | 'vendor' | 'artist' | 'promoter'

interface Readiness {
  state: 'not_connected' | 'setup_incomplete' | 'needs_debit_card' | 'ready'
  debitCardLast4: string | null
  headline: string
  detail: string
}

/** Shows whether the user's Stripe account can take Instant Payouts, and how to fix it when it can't. */
export default function InstantPayoutReadiness({ role }: { role: Role }) {
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await api.get(`/stripe/connect/${role}/instant-payouts`)
      setReadiness(res.data)
    } catch {
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [role])

  useEffect(() => { load() }, [load])

  // Coming back from the Stripe tab, re-check so the card shows up without a manual reload.
  useEffect(() => {
    const onFocus = () => { if (readiness && readiness.state !== 'ready') load() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [readiness, load])

  const openStripe = async () => {
    setOpening(true)
    setError('')
    try {
      const res = await api.post(`/stripe/connect/${role}/payout-settings-link`)
      window.open(res.data.url, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not open Stripe. Please try again.')
    } finally {
      setOpening(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking instant payout setup…
      </div>
    )
  }

  if (failed || !readiness) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-4">
        <p className="text-sm text-gray-600">We couldn&apos;t check your instant payout setup right now.</p>
        <button type="button" onClick={load} className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Try again
        </button>
      </div>
    )
  }

  const ready = readiness.state === 'ready'

  return (
    <div className="space-y-2">
    <div
      className={`rounded-lg border p-4 ${ready ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}
      data-testid="instant-payout-status"
    >
      <div className="flex items-start gap-3">
        {ready
          ? <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />}
        <div className="min-w-0 flex-1">
          <p className={`flex items-center gap-1.5 text-sm font-semibold ${ready ? 'text-green-800' : 'text-amber-900'}`}>
            <Zap className="h-4 w-4" /> {readiness.headline}
          </p>
          <p className={`mt-0.5 text-sm ${ready ? 'text-green-700' : 'text-amber-800'}`}>{readiness.detail}</p>

          {readiness.state === 'needs_debit_card' && (
            <button
              type="button"
              onClick={openStripe}
              disabled={opening}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
            >
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Add a debit card
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}
          {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
    <InstantPayoutHelp role={role} onOpenStripe={openStripe} opening={opening} />
    </div>
  )
}

const PAYOUT_STEPS: Record<Role, string> = {
  vendor: 'open Payouts in your dashboard, enter an amount, and choose Instant payout.',
  owner: 'open your Stripe dashboard, go to Balance, and choose Instant payout.',
  artist: 'open your Stripe dashboard, go to Balance, and choose Instant payout.',
  promoter: 'open your Stripe dashboard, go to Balance, and choose Instant payout.',
}

function InstantPayoutHelp({ role, onOpenStripe, opening }: { role: Role; onOpenStripe: () => void; opening: boolean }) {
  return (
    <details className="group rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-gray-900">
        <Info className="h-4 w-4 text-indigo-500" />
        How instant payouts work
        <span className="ml-auto text-xs font-normal text-indigo-600 group-open:hidden">Show</span>
        <span className="ml-auto hidden text-xs font-normal text-indigo-600 group-open:inline">Hide</span>
      </summary>
      <div className="mt-3 space-y-3">
        <p>
          Normally, money you earn reaches your bank on Stripe&apos;s payout schedule. With an <strong>instant payout</strong>,
          you can move your available balance to your debit card or eligible bank account in about 30 minutes, any day or time,
          including weekends and holidays.
        </p>
        <div>
          <p className="font-medium text-gray-900">To get set up</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Connect your account with Stripe. This is done once your payouts show as active.</li>
            <li>Add a Visa or Mastercard <strong>debit card</strong> in your Stripe payout settings. Prepaid cards and credit cards don&apos;t qualify.</li>
            <li>When you want your money, {PAYOUT_STEPS[role]}</li>
          </ol>
        </div>
        <div>
          <p className="font-medium text-gray-900">Good to know</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>Card payments are available for an instant payout right away.</li>
            <li>Bank (ACH) payments are only available after they clear, usually about 4 business days.</li>
            <li>Stripe charges a fee for each instant payout, about 1.5% (minimum $0.50). Standard payouts stay free.</li>
            <li>Instant payouts are subject to daily limits set by Stripe, so a large amount may need to wait or be split.</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={onOpenStripe}
          disabled={opening}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-60"
        >
          {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
          Open my Stripe payout settings
        </button>
      </div>
    </details>
  )
}
