'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import {
  FileText, CheckCircle2, Loader2, AlertCircle, CreditCard, Lock, Calendar,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface PublicOwnerInvoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  issue_date: string
  due_date: string
  status: 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  total_amount: number
  amount_paid: number
  amount_due: number
  notes: string | null
  terms: string | null
  deposit_percentage: number | null
  deposit_due_days_before: number | null
  final_payment_due_days_before: number | null
  booking?: { event?: { id: string; name: string; date: string } }
  items: Array<{
    id: string
    description: string
    quantity: number
    unit_price: number
    amount: number
    item_type?: string
  }>
}

type PaymentSelection = 'deposit' | 'full' | 'custom'

export default function OwnerInvoicePayPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string

  const [invoice, setInvoice] = useState<PublicOwnerInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [selection, setSelection] = useState<PaymentSelection>('full')
  const [customAmount, setCustomAmount] = useState('')

  const justPaid = searchParams.get('paid') === 'true'
  const wasCanceled = searchParams.get('canceled') === 'true'
  const sid = searchParams.get('sid') // Stripe session ID

  useEffect(() => {
    if (justPaid && sid) {
      fetch(`${API_URL}/stripe/invoice-pay/${token}/verify-payment?sid=${encodeURIComponent(sid)}`, { method: 'POST' })
        .then(r => r.json())
        .then(d => {
          if (d.paid) {
            setInvoice(prev => prev ? { ...prev, status: 'paid', amount_due: 0 } : prev)
          }
        })
        .catch(() => {})
    }
    fetchInvoice()
  }, [token])

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`${API_URL}/stripe/invoice-pay/${token}`)
      if (!res.ok) throw new Error('Invoice not found')
      const data = await res.json()
      setInvoice(data)
      // Default selection
      if (data.amount_paid > 0) {
        setSelection('full')
      } else if (data.deposit_percentage && data.deposit_percentage > 0) {
        setSelection('deposit')
      } else {
        setSelection('full')
      }
    } catch {
      setError('This invoice could not be found or the link has expired.')
    } finally {
      setLoading(false)
    }
  }

  const depositAmount = invoice && invoice.deposit_percentage
    ? Math.round(Number(invoice.total_amount) * Number(invoice.deposit_percentage) / 100 * 100) / 100
    : 0

  const amountDue = invoice ? Number(invoice.amount_due) : 0

  const resolvedAmountCents = (): number | null => {
    if (!invoice) return null
    if (selection === 'deposit') return Math.round(depositAmount * 100)
    if (selection === 'full') return Math.round(amountDue * 100)
    if (selection === 'custom') {
      const v = parseFloat(customAmount)
      if (isNaN(v) || v < 0.5 || v > amountDue) return null
      return Math.round(v * 100)
    }
    return null
  }

  const handlePay = async () => {
    const amountCents = resolvedAmountCents()
    if (!amountCents) return
    setPaying(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/stripe/invoice-pay/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to initiate payment')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed. Please try again.')
      setPaying(false)
    }
  }

  // ── States ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!invoice) return null

  const isPaid = invoice.status === 'paid' || justPaid
  const isPartial = invoice.status === 'partial' && !justPaid
  const isCancelled = invoice.status === 'cancelled'
  const hasDeposit = !!(invoice.deposit_percentage && invoice.deposit_percentage > 0 && invoice.amount_paid === 0)
  const canPay = !isPaid && !isCancelled

  const amountCentsForButton = resolvedAmountCents()
  const disablePay = !amountCentsForButton || paying || (selection === 'custom' && !customAmount)

  const eventDate = invoice.booking?.event?.date
  const eventName = invoice.booking?.event?.name

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-indigo-600 flex items-center justify-center mx-auto mb-3 shadow">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <p className="text-sm font-medium text-gray-500">Secure Invoice Payment</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

          {/* Invoice header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">Invoice</p>
                <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                {eventName && (
                  <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {eventName}{eventDate ? ` · ${new Date(eventDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">${Number(invoice.total_amount).toFixed(2)}</p>
                {isPartial && (
                  <p className="text-sm text-orange-500 font-medium">Partial — ${amountDue.toFixed(2)} left</p>
                )}
                {!isPaid && !isPartial && (
                  <p className="text-sm text-orange-500 font-medium">Balance due</p>
                )}
              </div>
            </div>
          </div>

          {/* Bill to */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1.5">Bill To</p>
            <p className="font-medium text-gray-800">{invoice.client_name}</p>
            {invoice.client_email && <p className="text-sm text-gray-500">{invoice.client_email}</p>}
          </div>

          {/* Partial payment progress */}
          {isPartial && (
            <div className="px-6 py-4 border-b border-gray-100 bg-amber-50">
              <p className="text-xs text-amber-700 font-semibold uppercase mb-2">Payment Progress</p>
              <div className="w-full bg-amber-200 rounded-full h-2 mb-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (Number(invoice.amount_paid) / Number(invoice.total_amount)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-amber-700">
                <span>Paid: ${Number(invoice.amount_paid).toFixed(2)}</span>
                <span>Remaining: ${amountDue.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Line items */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Items</p>
            <div className="space-y-2.5">
              {(invoice.items ?? [])
                .filter(item => item.item_type !== 'internal_note')
                .map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <p className="text-gray-800 font-medium">{item.description}</p>
                      <p className="text-gray-400 text-xs">{item.quantity} × ${Number(item.unit_price).toFixed(2)}</p>
                    </div>
                    <p className="font-semibold text-gray-900">${Number(item.amount).toFixed(2)}</p>
                  </div>
                ))}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>${Number(invoice.total_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes / terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="px-6 py-4 border-b border-gray-100 text-sm text-gray-500 space-y-2">
              {invoice.notes && <p>{invoice.notes}</p>}
              {invoice.terms && <p className="text-xs text-gray-400 italic">{invoice.terms}</p>}
            </div>
          )}

          {/* Payment selection / CTA */}
          <div className="px-6 py-5">
            {isPaid ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                Payment received. Thank you!
              </div>
            ) : isCancelled ? (
              <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 text-gray-500 rounded-xl px-4 py-3 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                This invoice has been cancelled.
              </div>
            ) : (
              <>
                {wasCanceled && (
                  <p className="text-sm text-orange-500 mb-3 text-center">
                    Payment was cancelled. You can try again below.
                  </p>
                )}

                {/* Amount selection */}
                <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Choose Amount</p>
                <div className="space-y-2 mb-4">
                  {/* Deposit option — only if not yet paid anything */}
                  {hasDeposit && (
                    <button
                      type="button"
                      onClick={() => setSelection('deposit')}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        selection === 'deposit'
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-amber-300'
                      }`}
                    >
                      <span>Pay Deposit ({invoice.deposit_percentage}%)</span>
                      <span className="font-bold">${depositAmount.toFixed(2)}</span>
                    </button>
                  )}

                  {/* Full / remaining balance */}
                  <button
                    type="button"
                    onClick={() => setSelection('full')}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                      selection === 'full'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-300'
                    }`}
                  >
                    <span>{isPartial ? 'Pay Remaining Balance' : 'Pay Full Balance'}</span>
                    <span className="font-bold">${amountDue.toFixed(2)}</span>
                  </button>

                  {/* Custom amount */}
                  <button
                    type="button"
                    onClick={() => setSelection('custom')}
                    className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium text-left transition-colors ${
                      selection === 'custom'
                        ? 'border-gray-400 bg-gray-50 text-gray-800'
                        : 'border-gray-200 bg-white text-gray-500 hover:border-gray-400'
                    }`}
                  >
                    Enter custom amount
                  </button>

                  {selection === 'custom' && (
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">$</span>
                      <input
                        type="number"
                        min={0.5}
                        max={amountDue}
                        step={0.01}
                        value={customAmount}
                        onChange={e => setCustomAmount(e.target.value)}
                        placeholder={`0.01 – ${amountDue.toFixed(2)}`}
                        className="w-full pl-7 pr-4 py-3 border-2 border-gray-300 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
                        autoFocus
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-500 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </p>
                )}

                <button
                  onClick={handlePay}
                  disabled={disablePay}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 text-base"
                >
                  {paying ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Redirecting…</>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Pay ${amountCentsForButton ? (amountCentsForButton / 100).toFixed(2) : '—'}
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-gray-400">
                  <Lock className="w-3 h-3" /> Secure payment powered by Stripe
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Powered by <span className="font-semibold text-gray-500">DoVenue Suite</span>
        </p>
      </div>
    </div>
  )
}
