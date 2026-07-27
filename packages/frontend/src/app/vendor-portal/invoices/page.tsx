'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { FileText, Plus, Send, Eye, CheckCircle2, Clock, XCircle, AlertCircle, DollarSign, ChevronRight, Building2, Search } from 'lucide-react'

interface VendorInvoice {
  id: string
  invoice_number: string
  invoice_type: 'client' | 'owner_booking'
  client_name: string
  client_email: string
  total_amount: number
  amount_due: number
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string
  created_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600 border-gray-200',      icon: <Clock className="w-3 h-3" /> },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: <Send className="w-3 h-3" /> },
  viewed:    { label: 'Viewed',    color: 'bg-purple-100 text-purple-700 border-purple-200', icon: <Eye className="w-3 h-3" /> },
  paid:      { label: 'Paid',      color: 'bg-green-100 text-green-700 border-green-200',    icon: <CheckCircle2 className="w-3 h-3" /> },
  overdue:   { label: 'Overdue',   color: 'bg-red-100 text-red-700 border-red-200',          icon: <AlertCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200',       icon: <XCircle className="w-3 h-3" /> },
}

export default function VendorInvoicesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [invoices, setInvoices] = useState<VendorInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) { router.push('/login'); return }
    fetchInvoices()
  }, [user])

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/vendor-invoices/mine')
      setInvoices(res.data || [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const filtered = invoices.filter(i => {
    if (filter && i.status !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        i.invoice_number.toLowerCase().includes(q) ||
        i.client_name.toLowerCase().includes(q) ||
        i.client_email.toLowerCase().includes(q)
      )
    }
    return true
  })

  const totals = invoices.reduce(
    (acc, inv) => {
      acc.total += Number(inv.total_amount)
      if (inv.status === 'paid') acc.paid += Number(inv.total_amount)
      if (['sent', 'viewed', 'overdue'].includes(inv.status)) acc.outstanding += Number(inv.amount_due)
      return acc
    },
    { total: 0, paid: 0, outstanding: 0 },
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/vendor-portal" className="text-sm text-gray-400 hover:text-gray-600 mb-1 inline-block">
              ← Vendor Portal
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary-600" />
              My Invoices
            </h1>
          </div>
          <Link
            href="/vendor-portal/invoices/new"
            className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Invoiced', value: `$${totals.total.toFixed(2)}`, color: 'text-gray-900' },
            { label: 'Collected',      value: `$${totals.paid.toFixed(2)}`,  color: 'text-green-600' },
            { label: 'Outstanding',    value: `$${totals.outstanding.toFixed(2)}`, color: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Status filter */}
        <div className="flex gap-3 mb-4 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by invoice #, client name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent"
            />
          </div>
          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent min-w-[160px]"
          >
            <option value="">All Statuses ({invoices.length})</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label} ({invoices.filter(i => i.status === k).length})
              </option>
            ))}
          </select>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20 text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3" />
            Loading invoices…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No invoices yet</p>
            <Link
              href="/vendor-portal/invoices/new"
              className="mt-4 inline-flex items-center gap-2 text-primary-600 text-sm hover:underline"
            >
              <Plus className="w-4 h-4" /> Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(inv => {
              const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft
              return (
                <Link
                  key={inv.id}
                  href={`/vendor-portal/invoices/${inv.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-8 h-8 text-primary-100 bg-primary-50 rounded-lg p-1.5 flex-shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900">{inv.invoice_number}</p>
                          {inv.invoice_type === 'owner_booking' && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 font-medium">
                              <Building2 className="w-3 h-3" /> Owner Booking
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{inv.client_name} · {inv.client_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="font-bold text-gray-900">${Number(inv.total_amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Due {inv.due_date}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
                        {cfg.icon} {cfg.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
