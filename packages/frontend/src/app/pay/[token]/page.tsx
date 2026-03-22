'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { FileText, CheckCircle2, Loader2, AlertCircle, CreditCard, Lock, Building2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface PublicInvoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  issue_date: string
  due_date: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total_amount: number
  amount_due: number
  notes: string | null
  terms: string | null
  vendor_invoice_items: Array<{ id: string; description: string; quantity: number; unit_price: number; amount: number }>
  vendor_accounts: { business_name: string; email: string; phone: string; city: string; state: string; profile_image_url: string | null }
}

export default function PublicInvoicePayPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = params.token as string

  const [invoice, setInvoice] = useState<PublicInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  const justPaid = searchParams.get('paid') === 'true'
  const wasCanceled = searchParams.get('canceled') === 'true'

  useEffect(() => {
    fetchInvoice()
  }, [token])

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`${API_URL}/vendor-invoices/public/${token}`)
      if (!res.ok) throw new Error('Invoice not found')
      const data = await res.json()
      setInvoice(data)
    } catch {
      setError('This invoice could not be found or the link has expired.')
    } finally {
      setLoading(false)
    }
  }

  const handlePay = async () => {
    setPaying(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/vendor-invoices/public/${token}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Failed to initiate payment')
      window.location.href = data.url
    } catch (err: any) {
      setError(err.message || 'Payment initiation failed. Please try again.')
      setPaying(false)
    }
  }

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
  const isCancelled = invoice.status === 'cancelled'
  const vendor = invoice.vendor_accounts
  const feeNote = '5% platform fee applies to payments processed via DoVenue Suite.'

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Vendor branding */}
        <div className="text-center mb-6">
          {vendor?.profile_image_url ? (
            <img
              src={vendor.profile_image_url}
              alt={vendor.business_name}
              className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-white shadow"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-7 h-7 text-indigo-500" />
            </div>
          )}
          <p className="font-semibold text-gray-900">{vendor?.business_name}</p>
          {(vendor?.city || vendor?.state) && (
            <p className="text-xs text-gray-400">{[vendor?.city, vendor?.state].filter(Boolean).join(', ')}</p>
          )}
        </div>

        {/* Invoice card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Invoice header */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-0.5">Invoice</p>
                <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                <p className="text-sm text-gray-500 mt-0.5">Due {invoice.due_date}</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">${Number(invoice.total_amount).toFixed(2)}</p>
                {!isPaid && <p className="text-sm text-orange-500 font-medium">Due now</p>}
              </div>
            </div>
          </div>

          {/* Bill to */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-1.5">Bill To</p>
            <p className="font-medium text-gray-800">{invoice.client_name}</p>
            <p className="text-sm text-gray-500">{invoice.client_email}</p>
          </div>

          {/* Line items */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase font-semibold mb-3">Items</p>
            <div className="space-y-2.5">
              {(invoice.vendor_invoice_items ?? []).map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div>
                    <p className="text-gray-800 font-medium">{item.description}</p>
                    <p className="text-gray-400 text-xs">{item.quantity} × ${Number(item.unit_price).toFixed(2)}</p>
                  </div>
                  <p className="font-semibold text-gray-900">${Number(item.amount).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.tax_rate) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tax ({invoice.tax_rate}%)</span>
                  <span>${Number(invoice.tax_amount).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-${Number(invoice.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
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

          {/* CTA */}
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
                  <p className="text-sm text-orange-500 mb-3 text-center">Payment was cancelled. You can try again below.</p>
                )}
                {error && (
                  <p className="text-sm text-red-500 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </p>
                )}
                <button
                  onClick={handlePay}
                  disabled={paying}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 text-base"
                >
                  {paying ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Redirecting to payment…</>
                  ) : (
                    <><CreditCard className="w-5 h-5" /> Pay ${Number(invoice.amount_due).toFixed(2)}</>
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
          Powered by <span className="font-semibold text-gray-500">DoVenue Suite</span> · {feeNote}
        </p>
      </div>
    </div>
  )
}
