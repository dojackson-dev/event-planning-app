'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { ClipboardCheck, Send, Pencil, Trash2, Loader2, Receipt, Copy, Check } from 'lucide-react'
import { ESTIMATE_STATUS, EDITABLE_ESTIMATE_STATUSES } from '@/components/vendor/estimateStatus'

const CONVERTIBLE = ['draft', 'sent', 'viewed', 'approved']

const localDate = (days = 0) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 10)
}

const money = (n: number | string) => `$${Number(n).toFixed(2)}`

export default function VendorEstimateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [estimate, setEstimate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'send' | 'convert' | 'delete' | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [showConvert, setShowConvert] = useState(false)
  const [dueDate, setDueDate] = useState(localDate(14))
  const [copied, setCopied] = useState(false)

  const load = () =>
    api.get(`/vendor-estimates/${id}`)
      .then(res => setEstimate(res.data))
      .catch(() => router.push('/vendors/dashboard/estimates'))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const errorText = (err: any, fallback: string) => {
    const detail = err?.response?.data?.message
    return Array.isArray(detail) ? detail.join(' ') : detail || fallback
  }

  const handleSend = async () => {
    if (!confirm(`Send estimate ${estimate.estimate_number} to ${estimate.client_email}?`)) return
    setBusy('send')
    setMessage(null)
    try {
      const res = await api.post(`/vendor-estimates/${id}/send`, {}, { timeout: 45000 })
      setMessage(
        res.data?.success === false
          ? { kind: 'error', text: 'The estimate is marked sent, but the email could not be delivered. Share the link below instead.' }
          : { kind: 'ok', text: 'Estimate sent to the client.' },
      )
      await load()
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err, 'We could not send the estimate. Please try again.') })
    } finally {
      setBusy(null)
    }
  }

  const handleConvert = async () => {
    setBusy('convert')
    setMessage(null)
    try {
      const res = await api.post(`/vendor-estimates/${id}/convert`, { due_date: dueDate }, { timeout: 45000 })
      router.push(`/vendor-portal/invoices/${res.data.invoice_id}`)
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err, 'We could not create the invoice. Please try again.') })
      setBusy(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete estimate ${estimate.estimate_number}? This cannot be undone.`)) return
    setBusy('delete')
    try {
      await api.delete(`/vendor-estimates/${id}`)
      router.push('/vendors/dashboard/estimates')
    } catch (err) {
      setMessage({ kind: 'error', text: errorText(err, 'We could not delete the estimate.') })
      setBusy(null)
    }
  }

  if (loading || !estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  const cfg = ESTIMATE_STATUS[estimate.status] ?? ESTIMATE_STATUS.draft
  const editable = EDITABLE_ESTIMATE_STATUSES.includes(estimate.status)
  const convertible = CONVERTIBLE.includes(estimate.status)
  const viewUrl = `${window.location.origin}/vendor-estimate/${estimate.public_token}`
  const items: any[] = estimate.vendor_estimate_items ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard/estimates" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">
          ← Back to Estimates
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary-600" />
              {estimate.estimate_number}
            </h1>
            <span className={`mt-2 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {editable && (
              <button
                onClick={handleSend}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60"
              >
                {busy === 'send' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {busy === 'send' ? 'Sending…' : estimate.status === 'draft' ? 'Send to Client' : 'Send Again'}
              </button>
            )}
            {convertible && (
              <button
                onClick={() => setShowConvert(v => !v)}
                disabled={busy !== null}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                <Receipt className="w-4 h-4" /> Convert to Invoice
              </button>
            )}
            {estimate.status === 'converted' && estimate.converted_invoice_id && (
              <Link
                href={`/vendor-portal/invoices/${estimate.converted_invoice_id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                <Receipt className="w-4 h-4" /> Open Invoice
              </Link>
            )}
            {editable && (
              <Link
                href={`/vendor-portal/estimates/${id}/edit`}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4" /> Edit
              </Link>
            )}
            {estimate.status !== 'converted' && (
              <button
                onClick={handleDelete}
                disabled={busy !== null}
                aria-label="Delete estimate"
                className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 bg-white rounded-lg text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {message && (
          <div
            role="alert"
            className={`rounded-xl p-4 mb-4 text-sm border ${message.kind === 'ok' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}
          >
            {message.text}
          </div>
        )}

        {showConvert && convertible && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4 text-sm">
            <p className="font-medium text-emerald-900 mb-1">Turn this estimate into an invoice</p>
            <p className="text-emerald-800 mb-3">
              Every line item, the tax and the discount carry over. The invoice starts as a draft that you can review,
              edit and send, and you can add items to it even after it is sent.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-emerald-900 mb-1">Invoice due date</label>
                <input
                  type="date"
                  value={dueDate}
                  min={localDate(0)}
                  onChange={e => setDueDate(e.target.value)}
                  className="border border-emerald-200 rounded-lg px-3 py-2 text-sm bg-white"
                />
              </div>
              <button
                onClick={handleConvert}
                disabled={busy !== null || !dueDate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy === 'convert' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                {busy === 'convert' ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </div>
        )}

        {estimate.status === 'approved' && estimate.responded_at && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-4 text-sm">
            {estimate.client_name} approved this estimate on {new Date(estimate.responded_at).toLocaleDateString()}.
            Convert it to an invoice when you are ready to collect payment.
          </div>
        )}
        {estimate.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">
            {estimate.client_name} declined this estimate. Create a new one if the details change.
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Prepared for</p>
              <p className="font-medium text-gray-900">{estimate.client_name}</p>
              {estimate.client_email && <p className="text-gray-600">{estimate.client_email}</p>}
              {estimate.client_phone && <p className="text-gray-600">{estimate.client_phone}</p>}
            </div>
            <div className="sm:text-right text-gray-600">
              <p>Issued {estimate.issue_date}</p>
              <p>Valid until {estimate.expiration_date}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Description</th>
                  <th className="text-right font-medium py-2">Qty</th>
                  <th className="text-right font-medium py-2">Unit price</th>
                  <th className="text-right font-medium py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 text-gray-900">{item.description}</td>
                    <td className="py-2 text-right text-gray-700">{Number(item.quantity)}</td>
                    <td className="py-2 text-right text-gray-700">{money(item.unit_price)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{money(estimate.subtotal)}</span></div>
            {Number(estimate.tax_rate) > 0 && (
              <div className="flex justify-between text-gray-600"><span>Tax ({Number(estimate.tax_rate)}%)</span><span>{money(estimate.tax_amount)}</span></div>
            )}
            {Number(estimate.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600"><span>Discount</span><span>-{money(estimate.discount_amount)}</span></div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
              <span>Total</span><span>{money(estimate.total_amount)}</span>
            </div>
          </div>

          {(estimate.notes || estimate.terms) && (
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-3 text-sm text-gray-600">
              {estimate.notes && <p><span className="font-medium text-gray-700">Notes: </span>{estimate.notes}</p>}
              {estimate.terms && <p><span className="font-medium text-gray-700">Terms: </span>{estimate.terms}</p>}
            </div>
          )}
        </div>

        {estimate.status !== 'draft' && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-sm">
            <p className="font-medium text-gray-700 mb-2">Client link</p>
            <div className="flex items-center gap-2">
              <input readOnly value={viewUrl} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 bg-gray-50" />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(viewUrl)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="inline-flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {estimate.viewed_at && <p className="text-xs text-gray-400 mt-2">First viewed {new Date(estimate.viewed_at).toLocaleString()}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
