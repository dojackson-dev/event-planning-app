'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
} from 'lucide-react'

interface OwnerBookingInvoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  total_amount: number
  amount_due: number
  amount_paid: number
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  issue_date: string
  notes: string | null
  public_token: string
  invoice_type: string
  vendor_accounts: {
    business_name: string
    email: string | null
    phone: string | null
  } | null
  vendor_bookings: {
    event_name: string | null
    event_date: string | null
    status: string
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-600', icon: <Clock className="w-3.5 h-3.5" /> },
  sent: { label: 'Awaiting Payment', classes: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  viewed: { label: 'Awaiting Payment', classes: 'bg-amber-100 text-amber-700', icon: <Clock className="w-3.5 h-3.5" /> },
  paid: { label: 'Paid', classes: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  overdue: { label: 'Overdue', classes: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-400', icon: null },
}

function VendorPaymentsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [invoices, setInvoices] = useState<OwnerBookingInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [justPaid, setJustPaid] = useState(false)

  const fetchInvoices = () => {
    setLoading(true)
    api.get('/vendor-invoices/owner-bookings')
      .then(r => setInvoices(r.data))
      .catch(e => setError(e.response?.data?.message || 'Failed to load vendor invoices'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    const paid = searchParams.get('paid') === 'true'
    const token = searchParams.get('token')

    if (paid && token) {
      setJustPaid(true)
      // Webhook fallback: verify payment with Stripe and mark as paid in DB
      api.post(`/vendor-invoices/public/${token}/verify-payment`)
        .catch(() => {})
        .finally(() => {
          fetchInvoices()
          // Clean the URL params
          router.replace('/dashboard/vendors/payments')
        })
    } else {
      fetchInvoices()
    }
  }, [])

  const handlePay = async (invoice: OwnerBookingInvoice) => {
    setPayingId(invoice.id)
    try {
      const { data } = await api.post(`/vendor-invoices/public/${invoice.public_token}/checkout`)
      if (data?.url) window.location.href = data.url
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to initiate payment')
    } finally {
      setPayingId(null)
    }
  }

  const unpaid = invoices.filter(i => !['paid', 'cancelled'].includes(i.status))
  const paid   = invoices.filter(i => i.status === 'paid')

  const totalOwed = unpaid.reduce((s, i) => s + Number(i.amount_due), 0)
  const totalPaid = paid.reduce((s, i) => s + Number(i.total_amount), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/vendors" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Invoices generated when you book vendors — paid by you, not your clients
          </p>
        </div>
      </div>

      {/* Payment success banner */}
      {justPaid && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 mb-5 text-sm font-medium">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          Payment successful! Your invoice has been marked as paid.
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Amount Owed</p>
          <p className="text-2xl font-bold text-amber-600">${totalOwed.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{unpaid.length} unpaid invoice{unpaid.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Paid</p>
          <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{paid.length} paid invoice{paid.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Note on fees */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6 text-sm text-blue-700 flex items-start gap-2">
        <DollarSign className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          A <strong>1.5% platform fee</strong> is added on top of Stripe&apos;s processing fee when paying vendor invoices.
          The fee is collected at checkout — no surprises at payment.
        </span>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && invoices.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium text-gray-500">No vendor invoices yet</p>
          <p className="text-sm mt-1">When you book a vendor with an agreed amount, an invoice will appear here.</p>
          <Link href="/dashboard/vendors" className="mt-4 inline-block text-indigo-600 text-sm hover:underline">
            Browse vendors →
          </Link>
        </div>
      )}

      {/* Unpaid invoices */}
      {unpaid.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Pending Payment</h2>
          <div className="space-y-3">
            {unpaid.map(inv => (
              <InvoiceRow key={inv.id} invoice={inv} onPay={handlePay} paying={payingId === inv.id} />
            ))}
          </div>
        </section>
      )}

      {/* Paid invoices */}
      {paid.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase mb-3">Paid</h2>
          <div className="space-y-3">
            {paid.map(inv => (
              <InvoiceRow key={inv.id} invoice={inv} onPay={handlePay} paying={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function InvoiceRow({
  invoice,
  onPay,
  paying,
}: {
  invoice: OwnerBookingInvoice
  onPay: (inv: OwnerBookingInvoice) => void
  paying: boolean
}) {
  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.sent
  const isPaid = invoice.status === 'paid'
  const isCancelled = invoice.status === 'cancelled'
  const canPay = !isPaid && !isCancelled && invoice.public_token

  const eventName  = invoice.vendor_bookings?.event_name ?? '—'
  const eventDate  = invoice.vendor_bookings?.event_date
    ? new Date(invoice.vendor_bookings.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null
  const dueDate = new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const isOverdue = !isPaid && new Date(invoice.due_date) < new Date()

  return (
    <Link
      href={`/dashboard/vendor-invoices/${invoice.id}`}
      className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer"
    >
      {/* Vendor icon */}
      <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
        <Building2 className="w-5 h-5 text-indigo-500" />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {invoice.vendor_accounts?.business_name ?? 'Vendor'}
          </p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
            {cfg.icon}{cfg.label}
          </span>
          {isOverdue && !isPaid && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <AlertCircle className="w-3.5 h-3.5" /> Overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
          {eventName && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {eventName}{eventDate ? ` · ${eventDate}` : ''}
            </span>
          )}
          <span>Invoice #{invoice.invoice_number}</span>
          <span>Due {dueDate}</span>
        </div>
      </div>

      {/* Amount + action */}
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
        <p className={`text-base font-bold ${isPaid ? 'text-green-600' : 'text-gray-900'}`}>
          ${Number(invoice.total_amount).toFixed(2)}
        </p>
        {isPaid ? (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Paid
          </span>
        ) : canPay ? (
          <button
            onClick={e => { e.preventDefault(); onPay(invoice) }}
            disabled={paying}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
          >
            {paying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5" />}
            {paying ? 'Redirecting…' : 'Pay Now'}
          </button>
        ) : null}
      </div>
    </Link>
  )
}

export default function VendorPaymentsPage() {
  return (
    <Suspense>
      <VendorPaymentsPageContent />
    </Suspense>
  )
}
