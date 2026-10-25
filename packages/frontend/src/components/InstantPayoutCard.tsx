'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'

interface InstantStatus {
  connected: boolean
  eligible: boolean
  reason: string | null
  max_payout_cents: number
  fee_rate: number
  fee_min_cents: number
}

const dollars = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function estimateFee(cents: number, s: InstantStatus) {
  return Math.max(s.fee_min_cents, Math.ceil(cents * s.fee_rate))
}

export default function InstantPayoutCard() {
  const [status, setStatus] = useState<InstantStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [amount, setAmount] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await api.get<InstantStatus>('/vendors/payouts/instant')
      setStatus(res.data)
      setAmount((res.data.max_payout_cents / 100).toFixed(2))
    } catch (err: any) {
      setLoadError(err.response?.data?.message || 'Could not check instant payouts right now.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return <div className="mt-6 rounded-lg border border-gray-200 p-4 text-sm text-gray-500">Checking instant payouts…</div>
  }
  if (loadError) {
    return (
      <div role="alert" className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {loadError} <button type="button" onClick={load} className="underline font-medium">Try again</button>
      </div>
    )
  }
  if (!status || !status.connected) return null

  const cents = Math.round(parseFloat(amount || '0') * 100)
  const validAmount = Number.isFinite(cents) && cents >= 100 && cents <= status.max_payout_cents
  const fee = validAmount ? estimateFee(cents, status) : 0

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await api.post('/vendors/payouts/instant', { amount_cents: cents })
      setSuccess(`Instant payout of ${dollars(cents)} requested. It usually reaches your debit card or bank within about 30 minutes.`)
      setConfirming(false)
      await load()
    } catch (err: any) {
      setError(err.response?.data?.message || 'The instant payout could not be completed.')
      setConfirming(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-6 rounded-lg border border-purple-200 bg-purple-50 p-4">
      <h4 className="text-sm font-semibold text-purple-900 mb-1">⚡ Get paid now (instant payout)</h4>
      <p className="text-sm text-purple-800 mb-3">
        Skip the wait and move available funds to your debit card or bank in about 30 minutes. Instant payouts cost{' '}
        <strong>{(status.fee_rate * 100).toFixed(1)}%</strong> (minimum {dollars(status.fee_min_cents)}), paid by you.
        Bank (ACH) payments can be paid out instantly only after they clear.
      </p>

      {success && <p role="status" className="mb-3 rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-800">{success}</p>}
      {error && <p role="alert" className="mb-3 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</p>}

      {!status.eligible ? (
        <p className="text-sm text-gray-600">{status.reason}</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">Available now: <strong>{dollars(status.max_payout_cents)}</strong></p>
          {!confirming ? (
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm text-gray-700">
                Amount to pay out
                <div className="mt-1 flex items-center rounded-lg border border-gray-300 bg-white px-3">
                  <span className="text-gray-500">$</span>
                  <input
                    inputMode="decimal"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setSuccess('') }}
                    className="w-32 py-2 pl-1 outline-none"
                    aria-label="Amount to pay out in dollars"
                  />
                </div>
              </label>
              <button
                type="button"
                disabled={!validAmount}
                onClick={() => { setError(''); setConfirming(true) }}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Pay out now
              </button>
              {!validAmount && amount !== '' && (
                <p className="w-full text-xs text-red-600">Enter between $1.00 and {dollars(status.max_payout_cents)}.</p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-purple-300 bg-white p-3 text-sm text-gray-800 space-y-2">
              <p>Pay out <strong>{dollars(cents)}</strong> now.</p>
              <p>Instant payout fee: about <strong>{dollars(fee)}</strong>, taken from your balance.</p>
              <div className="flex gap-2">
                <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 disabled:opacity-50">
                  {submitting ? 'Requesting…' : 'Confirm payout'}
                </button>
                <button type="button" onClick={() => setConfirming(false)} disabled={submitting} className="rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
