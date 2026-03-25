'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  Send, Copy, CheckCircle2, Loader2, Trash2, AlertCircle, ExternalLink
} from 'lucide-react'

interface VendorInvoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  client_phone?: string
  total_amount: number
  amount_due: number
  amount_paid: number
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string
  paid_at?: string
  notes?: string
  terms?: string
  public_token?: string
  vendor_invoice_items: Array<{ id: string; description: string; quantity: number; unit_price: number; amount: number }>
  vendor_accounts?: { business_name: string; email: string; phone?: string; city?: string; state?: string }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

export default function VendorInvoiceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [invoice, setInvoice] = useState<VendorInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/vendor-invoices/${id}`)
      .then(r => setInvoice(r.data))
      .catch(e => setError(e.response?.data?.message || 'Invoice not found'))
      .finally(() => setLoading(false))
  }, [id])

  const payLink = invoice?.public_token ? `${FRONTEND_URL}/pay/${invoice.public_token}` : ''

  const handleSend = async () => {
    setSending(true); setError('')
    try {
      await api.post(`/vendor-invoices/${id}/send`)
      const r = await api.get(`/vendor-invoices/${id}`)
      setInvoice(r.data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/vendor-invoices/${id}`)
      router.push('/dashboard/vendor-invoices')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete invoice')
      setDeleting(false)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(payLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
  if (error && !invoice) return <div className="p-6 text-red-600">{error}</div>
  if (!invoice) return null

  const isPaid = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const isDraft = invoice.status === 'draft'
  const vendor = invoice.vendor_accounts

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.push('/dashboard/vendor-invoices')} className="text-sm text-gray-500 hover:text-gray-800">
          ← Back to Invoices
        </button>
        <div className="flex gap-2">
          {!isPaid && !isCancelled && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isDraft ? 'Send Invoice' : 'Resend Invoice'}
            </button>
          )}
          {isDraft && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 border border-red-300 text-red-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Status banner */}
      {isPaid && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-6 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5" /> Paid on {invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString() : '—'}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 mb-6 text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Pay link (once sent) */}
      {(invoice.status === 'sent' || invoice.status === 'viewed') && payLink && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-6">
          <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Client Payment Link</p>
          <div className="flex gap-2">
            <input readOnly value={payLink} className="flex-1 border border-blue-200 rounded-lg px-3 py-1.5 text-sm bg-white truncate" />
            <button
              onClick={copyLink}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
            >
              {copied ? '✓ Copied' : <><Copy className="w-4 h-4 inline mr-1" />Copy</>}
            </button>
            <a href={payLink} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 border border-blue-300 rounded-lg text-sm text-blue-700 hover:bg-blue-100 flex items-center gap-1">
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </a>
          </div>
        </div>
      )}

      {/* Invoice document */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
            <p className="text-gray-500 mt-1">{invoice.invoice_number}</p>
          </div>
          <div className="text-right">
            {vendor?.business_name && <p className="font-semibold text-gray-900">{vendor.business_name}</p>}
            {(vendor?.city || vendor?.state) && (
              <p className="text-sm text-gray-500">{[vendor.city, vendor.state].filter(Boolean).join(', ')}</p>
            )}
            {vendor?.email && <p className="text-sm text-gray-500">{vendor.email}</p>}
            {vendor?.phone && <p className="text-sm text-gray-500">{vendor.phone}</p>}
            <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[invoice.status]}`}>
              {invoice.status}
            </span>
          </div>
        </div>

        {/* Bill to & dates */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Bill To</p>
            <p className="font-medium text-gray-800">{invoice.client_name}</p>
            <p className="text-sm text-gray-500">{invoice.client_email}</p>
            {invoice.client_phone && <p className="text-sm text-gray-500">{invoice.client_phone}</p>}
          </div>
          <div className="text-right">
            <div className="mb-1">
              <span className="text-gray-500 text-sm">Issue Date: </span>
              <span className="font-medium text-sm">{invoice.issue_date}</span>
            </div>
            <div>
              <span className="text-gray-500 text-sm">Due Date: </span>
              <span className="font-medium text-sm">{invoice.due_date}</span>
            </div>
          </div>
        </div>

        {/* Line items */}
        <table className="w-full mb-8 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-gray-600 font-semibold rounded-l">Description</th>
              <th className="text-center px-3 py-2 text-gray-600 font-semibold">Qty</th>
              <th className="text-right px-3 py-2 text-gray-600 font-semibold">Unit Price</th>
              <th className="text-right px-3 py-2 text-gray-600 font-semibold rounded-r">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoice.vendor_invoice_items?.map(item => (
              <tr key={item.id}>
                <td className="px-3 py-2.5 text-gray-800">{item.description}</td>
                <td className="px-3 py-2.5 text-center text-gray-600">{item.quantity}</td>
                <td className="px-3 py-2.5 text-right text-gray-600">${Number(item.unit_price).toFixed(2)}</td>
                <td className="px-3 py-2.5 text-right font-medium text-gray-900">${Number(item.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-6">
          <div className="w-60 text-sm space-y-1.5">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.tax_rate) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({invoice.tax_rate}%)</span><span>${Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span><span>-${Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-200">
              <span>Total</span><span>${Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            {Number(invoice.amount_paid) > 0 && (
              <>
                <div className="flex justify-between text-green-600">
                  <span>Paid</span><span>-${Number(invoice.amount_paid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-red-600 text-base pt-1 border-t border-gray-200">
                  <span>Balance Due</span><span>${Number(invoice.amount_due).toFixed(2)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes / Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="border-t border-gray-100 pt-4 text-sm text-gray-500 space-y-2">
            {invoice.notes && <p>{invoice.notes}</p>}
            {invoice.terms && <p className="italic text-xs">{invoice.terms}</p>}
          </div>
        )}
      </div>

      {/* Fee disclaimer */}
      <p className="text-center text-xs text-gray-400 mt-4">
        A 5% platform fee + Stripe's standard processing fees apply to all payments collected through DoVenue Suite.
      </p>
    </div>
  )
}
