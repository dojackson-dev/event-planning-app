'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, AlertCircle, ClipboardCheck } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface PublicEstimate {
  estimate_number: string
  client_name: string
  issue_date: string
  expiration_date: string
  status: 'sent' | 'viewed' | 'approved' | 'rejected' | 'converted'
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  notes: string | null
  terms: string | null
  vendor_estimate_items: Array<{ id: string; description: string; quantity: number; unit_price: number; amount: number }>
  vendor_accounts: { business_name: string; email: string | null; phone: string | null; city: string | null; state: string | null; profile_image_url: string | null } | null
}

const money = (n: number | string) => `$${Number(n).toFixed(2)}`

export default function PublicVendorEstimatePage() {
  const params = useParams()
  const token = params.token as string

  const [estimate, setEstimate] = useState<PublicEstimate | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/vendor-estimates/public/${token}`)
      .then(async res => {
        if (!res.ok) throw new Error('not found')
        setEstimate(await res.json())
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  const respond = async (approve: boolean) => {
    if (!estimate) return
    if (!approve && !confirm('Decline this estimate?')) return
    setBusy(approve ? 'approve' : 'decline')
    setError('')
    try {
      const res = await fetch(`${API_URL}/vendor-estimates/public/${token}/${approve ? 'approve' : 'decline'}`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Array.isArray(body.message) ? body.message.join(' ') : body.message || 'Something went wrong. Please try again.')
      setEstimate({ ...estimate, status: approve ? 'approved' : 'rejected' })
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  if (notFound || !estimate) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900">Estimate not found</h1>
          <p className="text-sm text-gray-500 mt-1">This link may be wrong or the estimate may have been removed. Contact the vendor who sent it.</p>
        </div>
      </div>
    )
  }

  const vendor = estimate.vendor_accounts
  const today = new Date().toISOString().slice(0, 10)
  const expired = estimate.expiration_date < today && ['sent', 'viewed'].includes(estimate.status)
  const canRespond = ['sent', 'viewed'].includes(estimate.status) && !expired

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          {vendor?.profile_image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={vendor.profile_image_url} alt={vendor.business_name} className="h-16 w-16 rounded-full object-cover mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{vendor?.business_name ?? 'Estimate'}</h1>
          {(vendor?.city || vendor?.state) && (
            <p className="text-sm text-gray-500">{[vendor.city, vendor.state].filter(Boolean).join(', ')}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
            <div>
              <p className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                <ClipboardCheck className="w-5 h-5 text-primary-600" /> Estimate {estimate.estimate_number}
              </p>
              <p className="text-sm text-gray-500 mt-1">Prepared for {estimate.client_name}</p>
            </div>
            <div className="text-sm text-gray-500 sm:text-right">
              <p>Issued {estimate.issue_date}</p>
              <p className={expired ? 'text-red-600 font-medium' : ''}>
                {expired ? 'Expired' : 'Valid until'} {estimate.expiration_date}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[360px]">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left font-medium py-2">Description</th>
                  <th className="text-right font-medium py-2">Qty</th>
                  <th className="text-right font-medium py-2">Price</th>
                  <th className="text-right font-medium py-2">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {estimate.vendor_estimate_items.map(item => (
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
            <div className="flex justify-between font-bold text-gray-900 text-lg pt-2 border-t border-gray-100">
              <span>Total</span><span>{money(estimate.total_amount)}</span>
            </div>
          </div>

          {(estimate.notes || estimate.terms) && (
            <div className="mt-6 pt-4 border-t border-gray-100 space-y-3 text-sm text-gray-600">
              {estimate.notes && <p><span className="font-medium text-gray-700">Notes: </span>{estimate.notes}</p>}
              {estimate.terms && <p><span className="font-medium text-gray-700">Terms: </span>{estimate.terms}</p>}
            </div>
          )}

          <div className="mt-8">
            {error && <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}

            {canRespond && (
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => respond(true)}
                  disabled={busy !== null}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-60"
                >
                  {busy === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve Estimate
                </button>
                <button
                  onClick={() => respond(false)}
                  disabled={busy !== null}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 border border-gray-300 bg-white text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  {busy === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Decline
                </button>
              </div>
            )}

            {(estimate.status === 'approved' || estimate.status === 'converted') && (
              <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 text-sm flex gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p>You approved this estimate. {vendor?.business_name ?? 'The vendor'} will send you an invoice to complete the booking.</p>
              </div>
            )}
            {estimate.status === 'rejected' && (
              <div className="bg-gray-50 border border-gray-200 text-gray-700 rounded-xl p-4 text-sm flex gap-2">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <p>You declined this estimate. Contact {vendor?.business_name ?? 'the vendor'} if you would like a new one.</p>
              </div>
            )}
            {expired && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 text-sm flex gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>This estimate has expired. Ask {vendor?.business_name ?? 'the vendor'} for an updated one.</p>
              </div>
            )}
          </div>

          {(vendor?.email || vendor?.phone) && (
            <p className="mt-6 text-xs text-gray-400 text-center">
              Questions? {[vendor.email, vendor.phone].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
