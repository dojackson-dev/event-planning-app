'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import clientApi from '@/lib/clientApi'
import {
  Receipt,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CreditCard,
} from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  sent:      { label: 'Awaiting Payment', color: 'bg-blue-100 text-blue-800 border-blue-200',     dot: 'bg-blue-500' },
  partial:   { label: 'Partial',          color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500' },
  overdue:   { label: 'Overdue',          color: 'bg-red-100 text-red-800 border-red-200',         dot: 'bg-red-500' },
  paid:      { label: 'Paid',             color: 'bg-green-100 text-green-800 border-green-200',   dot: 'bg-green-500' },
  cancelled: { label: 'Cancelled',        color: 'bg-gray-100 text-gray-600 border-gray-200',      dot: 'bg-gray-400' },
}

function isOverdue(invoice: any): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') return false
  if (!invoice.due_date) return false
  return new Date(invoice.due_date + 'T23:59:59') < new Date()
}

function isDueSoon(invoice: any): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled') return false
  if (!invoice.due_date) return false
  const days = (new Date(invoice.due_date + 'T23:59:59').getTime() - Date.now()) / 86_400_000
  return days >= 0 && days <= 7
}

export default function ClientInvoicesPage() {
  const searchParams = useSearchParams()
  const [invoices, setInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [paying, setPaying] = useState<string | null>(null)

  const paid = searchParams.get('paid')
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    clientApi.get('/invoices')
      .then((res) => setInvoices(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // After a successful payment redirect, poll until the paid invoice reflects the updated status
  useEffect(() => {
    if (!paid) return
    const invoiceNumber = searchParams.get('invoice')
    let attempts = 0
    const interval = setInterval(() => {
      attempts++
      clientApi.get('/invoices')
        .then(res => {
          setInvoices(res.data)
          const stillUnpaid = invoiceNumber
            ? res.data.some((i: any) => i.invoice_number === invoiceNumber && i.status !== 'paid')
            : false
          if (!stillUnpaid || attempts >= 5) clearInterval(interval)
        })
        .catch(() => clearInterval(interval))
    }, 2000)
    return () => clearInterval(interval)
  }, [paid])

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handlePayNow = async (invoiceId: string) => {
    try {
      setPaying(invoiceId)
      const res = await clientApi.post(`/invoices/${invoiceId}/checkout`)
      window.location.href = res.data.url
    } catch (err: any) {
      console.error('Failed to create checkout session', err)
      alert(err?.response?.data?.message ?? 'Unable to start payment. Please try again.')
      setPaying(null)
    }
  }

  const unpaidInvoices = invoices.filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled')
  const totalDue = unpaidInvoices.reduce((sum: number, i: any) => sum + Number(i.amount_due ?? 0), 0)
  const overdueCount = invoices.filter(isOverdue).length

  const filtered = filter === 'all'
    ? invoices
    : filter === 'unpaid'
    ? invoices.filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled')
    : invoices.filter((i: any) => i.status === filter)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading invoices...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Payment result banners */}
      {paid && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-300 rounded-xl px-4 py-3 text-green-800 text-sm">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-green-600" />
          <div>
            <p className="font-semibold">Payment successful!</p>
            <p className="text-green-600 mt-0.5">
              Invoice {searchParams.get('invoice') ? `#${searchParams.get('invoice')} ` : ''}has been paid. You'll receive a confirmation shortly.
            </p>
          </div>
        </div>
      )}
      {canceled && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-300 rounded-xl px-4 py-3 text-yellow-800 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-yellow-600" />
          <p>Payment was cancelled. Your invoice remains unpaid — you can try again whenever you're ready.</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="h-6 w-6 text-emerald-600" />
          Invoices
        </h1>
        <span className="text-sm text-gray-500">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Summary Cards */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-emerald-600 text-white rounded-xl p-5">
            <p className="text-emerald-100 text-xs font-medium uppercase tracking-wide mb-1">Total Balance Due</p>
            <p className="text-3xl font-bold">${totalDue.toFixed(2)}</p>
            <p className="text-emerald-200 text-xs mt-1">{unpaidInvoices.length} outstanding invoice{unpaidInvoices.length !== 1 ? 's' : ''}</p>
          </div>
          <div className={`rounded-xl p-5 border ${overdueCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
            <p className={`text-xs font-medium uppercase tracking-wide mb-1 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>Overdue</p>
            <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-700' : 'text-gray-400'}`}>{overdueCount}</p>
            <p className={`text-xs mt-1 ${overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
              {overdueCount > 0 ? 'Immediate attention needed' : 'All up to date'}
            </p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
            <p className="text-gray-500 text-xs font-medium uppercase tracking-wide mb-1">Paid</p>
            <p className="text-3xl font-bold text-gray-700">
              {invoices.filter((i: any) => i.status === 'paid').length}
            </p>
            <p className="text-gray-400 text-xs mt-1">invoices completed</p>
          </div>
        </div>
      )}

      {/* Overdue alert */}
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-800 text-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-semibold">You have {overdueCount} overdue invoice{overdueCount !== 1 ? 's' : ''}.</p>
            <p className="text-red-600 mt-0.5">Please review and complete payment as soon as possible to avoid any service disruptions.</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all',       label: 'All' },
          { key: 'unpaid',    label: 'Unpaid' },
          { key: 'sent',      label: 'Awaiting Payment' },
          { key: 'partial',   label: 'Partial' },
          { key: 'overdue',   label: 'Overdue' },
          { key: 'paid',      label: 'Paid' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              filter === key
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No invoices found.</p>
          <p className="text-gray-400 text-sm mt-1">Your invoices will appear here once your event coordinator sends them.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((invoice: any) => {
            const overdue = isOverdue(invoice)
            const dueSoon = isDueSoon(invoice)
            const cfg = STATUS_CONFIG[overdue ? 'overdue' : invoice.status] ?? STATUS_CONFIG.sent
            const isOpen = expanded.has(invoice.id)
            const revenueItems = (invoice.items ?? []).filter((i: any) => !i.item_type || i.item_type === 'revenue')

            return (
              <div
                key={invoice.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  overdue
                    ? 'border-red-300 ring-1 ring-red-200'
                    : invoice.status === 'paid'
                    ? 'border-green-200'
                    : dueSoon
                    ? 'border-yellow-300'
                    : 'border-gray-200'
                }`}
              >
                {/* Urgent banner */}
                {overdue && (
                  <div className="bg-red-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5" />
                    OVERDUE — Payment past due
                  </div>
                )}
                {!overdue && dueSoon && (
                  <div className="bg-yellow-500 text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    Payment due within 7 days
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Invoice number & client name */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-gray-900 text-base">
                          Invoice #{invoice.invoice_number}
                        </h3>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </div>

                      {invoice.client_name && (
                        <p className="text-sm text-gray-500 mt-0.5">{invoice.client_name}</p>
                      )}

                      {/* Dates */}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        {invoice.issue_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Issued {new Date(invoice.issue_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {invoice.due_date && (
                          <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : dueSoon ? 'text-yellow-700 font-medium' : ''}`}>
                            <Clock className="h-3.5 w-3.5" />
                            Due {new Date(invoice.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                        {invoice.paid_date && (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Paid {new Date(invoice.paid_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Amount due */}
                    <div className="text-right flex-shrink-0">
                      {invoice.status !== 'paid' ? (
                        <>
                          <p className="text-xs text-gray-400 mb-0.5">Amount Due</p>
                          <p className={`text-2xl font-bold ${overdue ? 'text-red-600' : 'text-emerald-700'}`}>
                            ${Number(invoice.amount_due ?? invoice.total_amount ?? 0).toFixed(2)}
                          </p>
                          {Number(invoice.amount_paid) > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              ${Number(invoice.amount_paid).toFixed(2)} paid
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400 mb-0.5">Total</p>
                          <p className="text-2xl font-bold text-green-600">
                            ${Number(invoice.total_amount ?? 0).toFixed(2)}
                          </p>
                          <p className="text-xs text-green-500 mt-0.5 flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-3 w-3" /> Paid in full
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Line items toggle */}
                  {revenueItems.length > 0 && (
                    <button
                      onClick={() => toggleExpand(invoice.id)}
                      className="mt-4 flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      {isOpen ? 'Hide' : 'View'} {revenueItems.length} line item{revenueItems.length !== 1 ? 's' : ''}
                    </button>
                  )}

                  {isOpen && revenueItems.length > 0 && (
                    <div className="mt-3 rounded-lg border border-gray-100 overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-xs text-gray-500">
                            <th className="text-left px-4 py-2">Description</th>
                            <th className="text-right px-4 py-2">Qty</th>
                            <th className="text-right px-4 py-2">Unit Price</th>
                            <th className="text-right px-4 py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {revenueItems.map((item: any) => (
                            <tr key={item.id}>
                              <td className="px-4 py-2.5 text-gray-800">{item.description}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{item.quantity}</td>
                              <td className="px-4 py-2.5 text-right text-gray-600">${Number(item.unit_price ?? 0).toFixed(2)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold text-gray-900">${Number(item.amount ?? 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-gray-200 bg-gray-50">
                          <tr>
                            <td colSpan={3} className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700">Total</td>
                            <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900">${Number(invoice.total_amount ?? 0).toFixed(2)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Notes */}
                  {invoice.notes && (
                    <p className="mt-3 text-xs text-gray-500 italic border-t border-gray-100 pt-3">{invoice.notes}</p>
                  )}

                  {/* CTA: Pay now */}
                  {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handlePayNow(invoice.id)}
                        disabled={paying === invoice.id}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm ${
                          paying === invoice.id
                            ? 'bg-emerald-400 text-white cursor-not-allowed'
                            : overdue
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                      >
                        <CreditCard className="h-4 w-4" />
                        {paying === invoice.id ? 'Redirecting to payment…' : `Pay $${Number(invoice.amount_due ?? invoice.total_amount ?? 0).toFixed(2)} Now`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
