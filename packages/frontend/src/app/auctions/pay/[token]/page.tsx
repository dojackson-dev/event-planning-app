'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { auctionApi, parseApiError, PaySummary } from '@/lib/auctionApi'
import { formatDateTime, formatUsd } from '@/components/auction/format'

export default function AuctionPayPage() {
  const { token } = useParams<{ token: string }>()
  const search = useSearchParams()
  const success = search.get('success') === 'true'
  const canceled = search.get('canceled') === 'true'

  const [summary, setSummary] = useState<PaySummary | null>(null)
  const [error, setError] = useState<{ message: string; final: boolean } | null>(null)
  const [busy, setBusy] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await auctionApi.get<PaySummary>(`/pay/${encodeURIComponent(token)}`)
      setSummary(res.data)
    } catch (err) {
      const failure = parseApiError(err)
      if (failure.status === 404) setError({ message: 'This payment link is not valid.', final: true })
      else if (failure.status === 410) setError({ message: 'This payment link has expired. Contact the organizer for a new one.', final: true })
      else setError({ message: failure.message, final: false })
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  // After returning from Stripe the webhook may not have landed yet, so refresh once shortly after.
  useEffect(() => {
    if (!success) return
    const t = setTimeout(load, 4000)
    return () => clearTimeout(t)
  }, [success, load])

  const pay = async () => {
    setBusy(true)
    setPayError(null)
    try {
      const res = await auctionApi.post<{ url: string }>(`/pay/${encodeURIComponent(token)}/checkout-session`)
      if (!res.data.url?.startsWith('https://')) throw new Error('bad url')
      window.location.href = res.data.url
    } catch (err) {
      setPayError(parseApiError(err, 'Could not start payment. Please try again.').message)
      setBusy(false)
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p role="alert" className="mb-3 text-gray-700">{error.message}</p>
        {!error.final && <button onClick={load} className="font-medium text-purple-600 underline">Try again</button>}
      </div>
    )
  }
  if (!summary) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-purple-600" aria-label="Loading payment" /></div>
  }

  const total = summary.amounts?.totalCents ?? null

  return (
    <div className="mx-auto max-w-lg">
      {success && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> Thank you! Your payment was received. A receipt will be emailed to you shortly.
        </p>
      )}
      {canceled && !summary.paid && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Payment was canceled. You have not been charged.</p>}

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <h1 className="text-xl font-bold text-gray-900">{summary.auctionTitle}</h1>
        {summary.organization && <p className="text-sm text-purple-700">{summary.organization}</p>}
        <p className="mt-2 text-sm text-gray-600">Hi {summary.firstName}, this order is linked to {summary.maskedEmail}.</p>

        <ul className="mt-4 divide-y divide-gray-100 text-sm">
          {summary.items.map((i, n) => (
            <li key={n} className="flex justify-between py-2"><span>{i.title}{i.quantity > 1 ? ` x${i.quantity}` : ''}</span><span>{formatUsd(i.priceCents * i.quantity)}</span></li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm text-gray-600">
          <p className="flex justify-between"><span>Subtotal</span><span>{formatUsd(summary.subtotalCents)}</span></p>
          {summary.amounts && summary.amounts.taxCents > 0 && <p className="flex justify-between"><span>Tax</span><span>{formatUsd(summary.amounts.taxCents)}</span></p>}
          {summary.amounts && summary.amounts.processingFeeCents > 0 && <p className="flex justify-between"><span>Processing fee</span><span>{formatUsd(summary.amounts.processingFeeCents)}</span></p>}
          <p className="flex justify-between text-base font-semibold text-gray-900"><span>Total</span><span>{total != null ? formatUsd(total) : `${formatUsd(summary.subtotalCents)} + fees at checkout`}</span></p>
        </div>

        {summary.paid ? (
          <p className="mt-5 flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" /> This order is paid.</p>
        ) : summary.payable ? (
          <>
            <p className="mt-5 text-xs text-gray-500">Pay by {formatDateTime(summary.payBy)}.</p>
            {payError && <p role="alert" className="mt-2 text-sm text-red-600">{payError}</p>}
            <button onClick={pay} disabled={busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 font-medium text-white hover:bg-purple-700 disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Pay securely
            </button>
          </>
        ) : (
          <p className="mt-5 text-sm text-gray-600">This order can no longer be paid online ({summary.status}). Contact the organizer if you have questions.</p>
        )}
      </div>
    </div>
  )
}
