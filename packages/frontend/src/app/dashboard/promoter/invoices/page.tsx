'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Plus, Loader2, FileText, DollarSign, Copy, CheckCircle2, Send } from 'lucide-react'

const FRONTEND_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'

interface PromoterInvoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  total_amount: number
  amount_due: number
  amount_paid: number
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string
  public_token?: string
}

interface ArtistBill {
  id: string
  invoice_number: string
  total_amount: number
  amount_due: number
  amount_paid: number
  status: string
  public_token: string
  issue_date?: string
  due_date?: string
  created_at: string
  artist_accounts?: { artist_name: string; stage_name: string | null } | null
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function PromoterInvoicesPage() {
  const [invoices, setInvoices] = useState<PromoterInvoice[]>([])
  const [bills, setBills] = useState<ArtistBill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const handleCopyLink = (inv: PromoterInvoice) => {
    if (!inv.public_token) return
    navigator.clipboard.writeText(`${FRONTEND_URL}/promoter-pay/${inv.public_token}`)
    setCopiedId(inv.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleSend = async (inv: PromoterInvoice) => {
    setSendingId(inv.id)
    try {
      await api.post(`/promoter-invoices/${inv.id}/send`)
      const r = await api.get('/promoter-invoices/mine')
      setInvoices(r.data || [])
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send invoice. Stripe account may not be connected.')
    } finally {
      setSendingId(null)
    }
  }

  useEffect(() => {
    Promise.all([
      api.get('/promoter-invoices/mine').then(r => setInvoices(r.data || [])),
      api.get('/promoter-bookings/artist-invoices/mine').then(r => setBills(r.data || [])).catch(() => {}),
    ])
      .catch(e => setError(e.response?.data?.message || 'Failed to load invoices'))
      .finally(() => setLoading(false))
  }, [])

  const outstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + Number(i.amount_due), 0)
  const collected = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount_paid), 0)
  const billsPaid = bills.filter(b => b.status === 'paid').reduce((s, b) => s + Number(b.amount_paid), 0)
  const billsOwed = bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled').reduce((s, b) => s + Number(b.amount_due), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Title row */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-5 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        </div>
      </div>

      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard/promoter" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
          <Link href="/dashboard/promoter/invoices/new"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${outstanding.toFixed(0)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-gray-500 uppercase">Collected</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">${collected.toFixed(0)}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : invoices.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No invoices yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create an invoice and get paid via Stripe.</p>
            <Link href="/dashboard/promoter/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Invoice
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Due</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/promoter/invoices/${inv.id}`} className="font-medium text-blue-600 hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{inv.client_name}</p>
                      <p className="text-xs text-gray-400">{inv.client_email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{inv.due_date}</td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">${Number(inv.total_amount).toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {inv.public_token && (
                          <button
                            onClick={() => handleCopyLink(inv)}
                            title="Copy pay link"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                            {copiedId === inv.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </button>
                        )}
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button
                            onClick={() => handleSend(inv)}
                            disabled={sendingId === inv.id}
                            title="Send invoice"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors disabled:opacity-50">
                            {sendingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Bills from Artists (artist invoices billed to this promoter) */}
        {bills.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Bills from Artists</h2>
              <div className="text-xs text-gray-500">
                <span className="text-gray-700 font-medium">${billsPaid.toFixed(0)}</span> paid · <span className="text-orange-600 font-medium">${billsOwed.toFixed(0)}</span> owed
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Artist</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Due</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bills.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{b.invoice_number}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {b.artist_accounts?.stage_name || b.artist_accounts?.artist_name || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{b.due_date || '—'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">${Number(b.total_amount).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-700'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`${FRONTEND_URL}/artist-pay/${b.public_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
