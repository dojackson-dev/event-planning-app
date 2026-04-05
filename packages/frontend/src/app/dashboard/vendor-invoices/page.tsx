'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Plus, FileText, Send, Eye, Loader2 } from 'lucide-react'

interface VendorInvoice {
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
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-purple-100 text-purple-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function VendorInvoicesPage() {
  const router = useRouter()
  const { activeRole } = useAuth()
  const [invoices, setInvoices] = useState<VendorInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Owners don't have a vendor account — redirect to their vendor payments page
    if (activeRole === 'owner') {
      router.replace('/dashboard/vendors/payments')
      return
    }
    api.get('/vendor-invoices/mine')
      .then(r => setInvoices(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load invoices. Make sure your vendor account is set up.'))
      .finally(() => setLoading(false))
  }, [activeRole])

  const totalOutstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').reduce((s, i) => s + Number(i.amount_due), 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total_amount), 0)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Vendor Invoices</h1>
        <p className="text-sm text-gray-500 mt-1 mb-3">Create and send invoices to your booked clients</p>
        <div className="flex justify-center">
          <Link
            href="/dashboard/vendor-invoices/new"
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Outstanding</p>
          <p className="text-2xl font-bold text-orange-600">${totalOutstanding.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Collected</p>
          <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <FileText className="w-10 h-10 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No invoices yet</p>
          <p className="text-gray-400 text-sm mt-1 mb-4">Create your first invoice to start getting paid</p>
          <Link href="/dashboard/vendor-invoices/new" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            <Plus className="w-4 h-4" /> Create Invoice
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Invoice #</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Client</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Due</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Amount</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/dashboard/vendor-invoices/${inv.id}`)}>
                  <td className="px-4 py-3 font-medium text-indigo-600">{inv.invoice_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{inv.client_name}</p>
                    <p className="text-gray-400 text-xs">{inv.client_email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{inv.due_date}</td>
                  <td className="px-4 py-3 text-right">
                    <p className="font-semibold text-gray-900">${Number(inv.total_amount).toFixed(2)}</p>
                    {inv.status !== 'paid' && Number(inv.amount_due) < Number(inv.total_amount) && (
                      <p className="text-xs text-orange-500">${Number(inv.amount_due).toFixed(2)} due</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === 'draft' && (
                      <span className="text-xs text-blue-600 flex items-center gap-1 justify-end">
                        <Send className="w-3 h-3" /> Send
                      </span>
                    )}
                    {(inv.status === 'sent' || inv.status === 'viewed') && (
                      <span className="text-xs text-purple-600 flex items-center gap-1 justify-end">
                        <Eye className="w-3 h-3" /> View
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
