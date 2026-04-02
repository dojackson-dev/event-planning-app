'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import VendorNav from '@/components/VendorNav'
import { Clock, Send, Eye, CheckCircle2, AlertCircle, XCircle, ChevronRight, DollarSign, Plus, FileText } from 'lucide-react'
import type { VendorProfile, VendorInvoice } from '@/lib/vendorTypes'

const INVOICE_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:     { label: 'Draft',     color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <Clock className="w-3 h-3" /> },
  sent:      { label: 'Sent',      color: 'bg-blue-100 text-blue-700 border-blue-200',        icon: <Send className="w-3 h-3" /> },
  viewed:    { label: 'Viewed',    color: 'bg-purple-100 text-purple-700 border-purple-200',  icon: <Eye className="w-3 h-3" /> },
  paid:      { label: 'Paid',      color: 'bg-green-100 text-green-700 border-green-200',     icon: <CheckCircle2 className="w-3 h-3" /> },
  overdue:   { label: 'Overdue',   color: 'bg-red-100 text-red-700 border-red-200',           icon: <AlertCircle className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500 border-gray-200',        icon: <XCircle className="w-3 h-3" /> },
}

export default function InvoicesPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [invoices, setInvoices] = useState<VendorInvoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    const load = async () => {
      try {
        const [profileRes, invoicesRes] = await Promise.all([
          api.get('/vendors/account/me'),
          api.get('/vendor-invoices/mine'),
        ])
        setProfile(profileRes.data)
        setInvoices(invoicesRes.data || [])
      } catch (err: any) {
        if (err.response?.status === 401) router.replace('/vendors/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  const totals = invoices.reduce(
    (acc, inv) => {
      acc.total += Number(inv.total_amount)
      if (inv.status === 'paid') acc.paid += Number(inv.total_amount)
      if (['sent', 'viewed', 'overdue'].includes(inv.status)) acc.outstanding += Number(inv.amount_due)
      return acc
    },
    { total: 0, paid: 0, outstanding: 0 }
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNav profile={profile} currentPage="Invoices" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Invoiced', value: `$${totals.total.toFixed(2)}`,      color: 'text-gray-900'   },
            { label: 'Collected',      value: `$${totals.paid.toFixed(2)}`,        color: 'text-green-600'  },
            { label: 'Outstanding',    value: `$${totals.outstanding.toFixed(2)}`, color: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Header + New button */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-semibold text-gray-700 text-sm">All Invoices</h1>
          <Link
            href="/vendor-portal/invoices/new"
            className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </Link>
        </div>

        {invoices.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No invoices yet</p>
            <Link href="/vendor-portal/invoices/new" className="mt-4 inline-flex items-center gap-2 text-primary-600 text-sm hover:underline">
              <Plus className="w-4 h-4" /> Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {invoices.map(inv => {
              const cfg = INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.draft
              return (
                <Link
                  key={inv.id}
                  href={`/vendor-portal/invoices/${inv.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-primary-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <DollarSign className="w-8 h-8 text-primary-400 bg-primary-50 rounded-lg p-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500 truncate">{inv.client_name} · {inv.client_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="font-bold text-gray-900 text-sm">${Number(inv.total_amount).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">Due {inv.due_date}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.color}`}>
                      {cfg.icon} {cfg.label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
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
