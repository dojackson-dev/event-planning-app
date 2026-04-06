'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import {
  FileText, Send, Trash2, Loader2, CheckCircle2, Clock, Eye,
  AlertCircle, XCircle, Copy, ExternalLink, DollarSign, Pencil,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600',      icon: <Clock className="w-4 h-4" /> },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700',       icon: <Send className="w-4 h-4" /> },
  viewed:    { label: 'Viewed',    color: 'bg-purple-100 text-purple-700',   icon: <Eye className="w-4 h-4" /> },
  paid:      { label: 'Paid',      color: 'bg-green-100 text-green-700',     icon: <CheckCircle2 className="w-4 h-4" /> },
  overdue:   { label: 'Overdue',   color: 'bg-red-100 text-red-700',         icon: <AlertCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500',       icon: <XCircle className="w-4 h-4" /> },
}

export default function VendorInvoiceDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = params.id as string

  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState('')

  const justPaid = searchParams.get('paid') === 'true'

  useEffect(() => {
    fetchInvoice()
  }, [id])

  useEffect(() => {
    if (justPaid) showToast('Payment received! Invoice marked as paid.')
  }, [justPaid])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const fetchInvoice = async () => {
    try {
      const res = await api.get(`/vendor-invoices/${id}`)
      setInvoice(res.data)
    } catch {
      router.push('/vendor-portal/invoices')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!confirm(`Send invoice ${invoice.invoice_number} to ${invoice.client_email}?`)) return
    setSending(true)
    try {
      await api.post(`/vendor-invoices/${id}/send`)
      await fetchInvoice()
      showToast('Invoice sent successfully!')
    } catch {
      showToast('Failed to send invoice. Please check your email settings.')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Delete invoice ${invoice?.invoice_number}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await api.delete(`/vendor-invoices/${id}`)
      router.push('/vendor-portal/invoices')
    } catch {
      showToast('Failed to delete invoice.')
      setDeleting(false)
    }
  }

  const paymentUrl = invoice
    ? `${window.location.origin}/pay/${invoice.public_token ?? ''}`
    : ''

  const copyPaymentLink = () => {
    navigator.clipboard.writeText(paymentUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!invoice) return null

  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft
  const canSend = ['draft', 'sent', 'viewed', 'overdue'].includes(invoice.status)
  const isPaid = invoice.status === 'paid'
  const canEdit = !['paid', 'cancelled'].includes(invoice.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-lg z-50 text-sm animate-fade-in">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/vendor-portal/invoices" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">
          ← Back to Invoices
        </Link>

        {/* Invoice header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
                <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
              <p className="text-sm text-gray-500">Issued {invoice.issue_date} · Due {invoice.due_date}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${Number(invoice.total_amount).toFixed(2)}</p>
              {!isPaid && (
                <p className="text-sm text-orange-600 font-medium">
                  ${Number(invoice.amount_due).toFixed(2)} due
                </p>
              )}
            </div>
          </div>

          {/* Bill to */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Bill To</p>
            <p className="font-medium text-gray-800">{invoice.client_name}</p>
            <p className="text-sm text-gray-500">{invoice.client_email}</p>
            {invoice.client_phone && <p className="text-sm text-gray-500">{invoice.client_phone}</p>}
          </div>

          {/* Actions */}
          {!isPaid && (
            <div className="mt-5 pt-5 border-t border-gray-100 flex flex-wrap gap-3">
              {canSend && (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-60"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? 'Sending…' : 'Send to Client'}
                </button>
              )}

              {canEdit && (
                <Link
                  href={`/vendor-portal/invoices/${id}/edit`}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </Link>
              )}

              {/* Copy payment link */}
              <button
                onClick={copyPaymentLink}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Payment Link'}
              </button>

              <a
                href={paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Preview
              </a>
            </div>
          )}

          {isPaid && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm font-medium">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  Payment received {invoice.paid_at ? `on ${new Date(invoice.paid_at).toLocaleDateString()}` : ''}.
                </div>
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm">
                  <div className="text-gray-600">
                    <span className="font-medium">Platform fee (5%):</span> ${(Number(invoice.total_amount) * 0.05).toFixed(2)}
                  </div>
                  <div className="font-bold text-gray-900">
                    Your net payout: <span className="text-green-700">${(Number(invoice.total_amount) * 0.95).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-5">
          <h2 className="font-semibold text-gray-700 mb-4">Line Items</h2>
          <div className="space-y-2">
            {(invoice.vendor_invoice_items ?? []).map((item: any) => (
              <div key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">{item.description}</p>
                  <p className="text-gray-400 text-xs">{item.quantity} × ${Number(item.unit_price).toFixed(2)}</p>
                </div>
                <p className="font-semibold text-gray-900">${Number(item.amount).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.tax_rate) > 0 && (
              <div className="flex justify-between text-gray-600">
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
            {!isPaid && (
              <div className="flex justify-between text-sm text-orange-600 pt-1">
                <span>Platform fee (5%)</span>
                <span>-${(Number(invoice.total_amount) * 0.05).toFixed(2)}</span>
              </div>
            )}
            {!isPaid && (
              <div className="flex justify-between text-sm font-semibold text-green-700 pb-1">
                <span>Your net payout</span>
                <span>${(Number(invoice.total_amount) * 0.95).toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Notes / Terms */}
        {(invoice.notes || invoice.terms) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-5">
            {invoice.notes && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.notes}</p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Payment Terms</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{invoice.terms}</p>
              </div>
            )}
          </div>
        )}

        {/* Danger zone */}
        {!isPaid && (
          <div className="flex justify-end">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors disabled:opacity-60"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Deleting…' : 'Delete Invoice'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
