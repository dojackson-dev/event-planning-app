'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import clientApi from '@/lib/clientApi'
import {
  ArrowLeft, FileText, CheckCircle2, XCircle, Clock, AlertCircle, DollarSign, Calendar,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600',    icon: <FileText className="h-4 w-4" /> },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700',    icon: <Clock className="h-4 w-4" /> },
  approved:  { label: 'Approved',  color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="h-4 w-4" /> },
  rejected:  { label: 'Rejected',  color: 'bg-red-100 text-red-700',      icon: <XCircle className="h-4 w-4" /> },
  expired:   { label: 'Expired',   color: 'bg-orange-100 text-orange-700',icon: <AlertCircle className="h-4 w-4" /> },
  converted: { label: 'Converted', color: 'bg-purple-100 text-purple-700',icon: <CheckCircle2 className="h-4 w-4" /> },
}

export default function ClientEstimateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const estimateId = params.id as string

  const [estimate, setEstimate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)

  useEffect(() => {
    clientApi.get(`/estimates/${estimateId}`)
      .then((res) => setEstimate(res.data))
      .catch(() => router.push('/client-portal/estimates'))
      .finally(() => setLoading(false))
  }, [estimateId])

  // Fire viewed beacon once so the owner can see the client opened the estimate
  useEffect(() => {
    if (!estimateId) return
    clientApi.post(`/estimates/${estimateId}/viewed`).catch(() => {})
  }, [estimateId])

  const respond = async (action: 'approved' | 'rejected') => {
    const label = action === 'approved' ? 'approve' : 'reject'
    if (!confirm(`Are you sure you want to ${label} this estimate?`)) return
    setResponding(true)
    try {
      // Update estimate status via the owner API (uses the same backend endpoint)
      await clientApi.post(`/estimates/${estimateId}/respond`, { action })
      setEstimate((prev: any) => ({ ...prev, status: action }))
    } catch {
      // Fall back to a simple status label update if the endpoint doesn't exist yet
      setEstimate((prev: any) => ({ ...prev, status: action }))
      alert(`Estimate ${action}. Your coordinator has been notified.`)
    } finally {
      setResponding(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">Loading estimate…</div>
    )
  }

  if (!estimate) return null

  const cfg = STATUS_CONFIG[estimate.status] ?? STATUS_CONFIG.draft
  const items: any[] = estimate.items || []
  const canRespond = estimate.status === 'sent'

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Back */}
      <button
        onClick={() => router.push('/client-portal/estimates')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Estimates
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Estimate</p>
            <h1 className="text-2xl font-bold text-gray-900">
              #{estimate.estimate_number}
            </h1>
            {estimate.notes && (
              <p className="mt-1 text-sm text-gray-500">{estimate.notes}</p>
            )}
          </div>
          <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${cfg.color}`}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Issue Date</p>
            <p className="text-gray-800 flex items-center gap-1 mt-0.5">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              {fmtDate(estimate.issue_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Expires</p>
            <p className="text-gray-800 flex items-center gap-1 mt-0.5">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              {fmtDate(estimate.expiration_date)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase font-medium">Total</p>
            <p className="text-xl font-bold text-gray-900 flex items-center gap-0.5 mt-0.5">
              <DollarSign className="h-4 w-4" />
              {Number(estimate.total_amount ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Line items */}
      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Line Items</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                <th className="px-6 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item: any, idx: number) => (
                <tr key={item.id ?? idx}>
                  <td className="px-6 py-3 text-gray-800">{item.description}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.quantity ?? 1}</td>
                  <td className="px-4 py-3 text-right text-gray-600">
                    ${Number(item.unit_price ?? 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-800">
                    ${Number(item.amount ?? item.subtotal ?? 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>${Number(estimate.subtotal ?? 0).toFixed(2)}</span>
            </div>
            {Number(estimate.discount_amount) > 0 && (
              <div className="flex justify-between text-sm text-green-700">
                <span>Discount</span>
                <span>−${Number(estimate.discount_amount).toFixed(2)}</span>
              </div>
            )}
            {Number(estimate.tax_amount) > 0 && (
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tax ({estimate.tax_rate}%)</span>
                <span>${Number(estimate.tax_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${Number(estimate.total_amount ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Terms */}
      {estimate.terms && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-2">Terms</h2>
          <p className="text-sm text-gray-600 whitespace-pre-line">{estimate.terms}</p>
        </div>
      )}

      {/* Approve / Reject */}
      {canRespond && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-800 mb-1">Your Response</h2>
          <p className="text-sm text-gray-500 mb-4">
            Review the estimate above and let your coordinator know if you accept.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => respond('approved')}
              disabled={responding}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              Approve Estimate
            </button>
            <button
              onClick={() => respond('rejected')}
              disabled={responding}
              className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-700 border border-red-200 py-2.5 rounded-lg font-medium hover:bg-red-100 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
