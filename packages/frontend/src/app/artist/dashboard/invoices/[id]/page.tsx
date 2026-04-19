'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Send, Copy, CheckCircle2, Loader2, Trash2, ExternalLink } from 'lucide-react'

interface ArtistInvoice {
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
  artist_invoice_items: Array<{ id: string; description: string; quantity: number; unit_price: number; amount: number }>
  artist_accounts?: { artist_name: string; stage_name?: string; email: string; phone?: string; city?: string; state?: string }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

export default function ArtistInvoiceDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()

  const [invoice, setInvoice] = useState<ArtistInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/artist-invoices/${id}`)
      .then(r => setInvoice(r.data))
      .catch(e => setError(e.response?.data?.message || 'Invoice not found'))
      .finally(() => setLoading(false))
  }, [id])

  const payLink = invoice?.public_token ? `${FRONTEND_URL}/artist-pay/${invoice.public_token}` : ''

  const handleSend = async () => {
    setSending(true); setError('')
    try {
      await api.post(`/artist-invoices/${id}/send`)
      const r = await api.get(`/artist-invoices/${id}`)
      setInvoice(r.data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send invoice. Make sure your Stripe account is connected.')
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return
    setDeleting(true)
    try {
      await api.delete(`/artist-invoices/${id}`)
      router.push('/artist/dashboard/invoices')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to delete invoice')
      setDeleting(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(payLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error || 'Invoice not found'}</p>
          <Link href="/artist/dashboard/invoices" className="mt-4 inline-block text-sm text-blue-600 underline">Back to invoices</Link>
        </div>
      </div>
    )
  }

  const artistName = invoice.artist_accounts?.stage_name || invoice.artist_accounts?.artist_name || 'Artist'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/artist/dashboard/invoices" className="text-sm text-gray-500 hover:text-gray-700">← Invoices</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm font-semibold text-gray-800">{invoice.invoice_number}</span>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[invoice.status]}`}>
            {invoice.status}
          </span>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <button onClick={handleSend} disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {invoice.status === 'draft' ? 'Send Invoice' : 'Resend'}
            </button>
          )}
          {payLink && (
            <>
              <button onClick={handleCopyLink}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Pay Link'}
              </button>
              <a href={payLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
                <ExternalLink className="w-4 h-4" /> View as Client
              </a>
            </>
          )}
          {invoice.status === 'draft' && (
            <button onClick={handleDelete} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 ml-auto disabled:opacity-50">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete
            </button>
          )}
        </div>

        {/* Invoice card */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
          <div className="flex justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{invoice.invoice_number}</h1>
              <p className="text-sm text-gray-500 mt-1">{artistName}</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Issued: {invoice.issue_date}</p>
              <p>Due: {invoice.due_date}</p>
              {invoice.paid_at && <p className="text-green-600">Paid: {invoice.paid_at.split('T')[0]}</p>}
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-700 mb-1">Bill To</p>
            <p className="text-sm text-gray-800 font-medium">{invoice.client_name}</p>
            <p className="text-sm text-gray-500">{invoice.client_email}</p>
            {invoice.client_phone && <p className="text-sm text-gray-500">{invoice.client_phone}</p>}
          </div>

          <div className="border-t pt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-500 uppercase pb-2">
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-center">Qty</th>
                  <th className="pb-2 text-right">Price</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoice.artist_invoice_items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 text-gray-800">{item.description}</td>
                    <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                    <td className="py-2 text-right text-gray-600">${Number(item.unit_price).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium text-gray-900">${Number(item.amount).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t pt-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span><span>${Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            {Number(invoice.tax_rate) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Tax ({invoice.tax_rate}%)</span><span>${Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}
            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span><span>-${Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 text-base pt-1 border-t">
              <span>Total</span><span>${Number(invoice.total_amount).toFixed(2)}</span>
            </div>
            {Number(invoice.amount_paid) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Paid</span><span>-${Number(invoice.amount_paid).toFixed(2)}</span>
              </div>
            )}
            {invoice.status !== 'paid' && (
              <div className="flex justify-between font-bold text-orange-700">
                <span>Amount Due</span><span>${Number(invoice.amount_due).toFixed(2)}</span>
              </div>
            )}
          </div>

          {(invoice.notes || invoice.terms) && (
            <div className="border-t pt-4 space-y-2">
              {invoice.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                  <p className="text-sm text-gray-600">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Terms</p>
                  <p className="text-sm text-gray-600">{invoice.terms}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
