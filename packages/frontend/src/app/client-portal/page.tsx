'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useClientAuth } from '@/contexts/ClientAuthContext'
import clientApi from '@/lib/clientApi'
import {
  Calendar,
  Store,
  FileText,
  MessageSquare,
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock,
  Receipt,
  AlertCircle,
  MapPin,
} from 'lucide-react'

interface OverviewData {
  bookings: any[]
  contracts: any[]
  estimates: any[]
  invoices: any[]
}

const statusColor: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700',
  pending:   'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  draft:     'bg-gray-100 text-gray-600',
  signed:    'bg-green-100 text-green-700',
  sent:      'bg-blue-100 text-blue-700',
  approved:  'bg-green-100 text-green-700',
}

export default function ClientPortalPage() {
  const { client } = useClientAuth()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clientApi.get('/overview')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const upcoming = (data?.bookings ?? [])
    .filter((b: any) => b.event?.date && new Date(b.event.date + 'T12:00:00') >= new Date())
    .slice(0, 3)

  const invoices = data?.invoices ?? []
  const unpaidInvoices = invoices.filter((i: any) => i.status !== 'paid' && i.status !== 'cancelled')
  const overdueInvoices = unpaidInvoices.filter((i: any) => {
    if (!i.due_date) return false
    return new Date(i.due_date + 'T23:59:59') < new Date()
  })
  const totalDue = unpaidInvoices.reduce((sum: number, i: any) => sum + Number(i.amount_due ?? i.total_amount ?? 0), 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-primary-600 text-white px-8 py-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {client?.firstName}!
          </h1>
          <p className="mt-1 text-primary-100 text-sm">
            Here's everything you need to know about your upcoming events.
          </p>
        </div>
        <button
          onClick={() => (window as any).__openClientPortalTour?.()}
          className="flex-shrink-0 flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-2 rounded-xl"
        >
          <MapPin className="h-3.5 w-3.5" />
          Take a Tour
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">Loading your information...</div>
      ) : (
        <>
          {/* ── INVOICES — Primary Feature ──────────────────────────────── */}
          <div className={`rounded-2xl border-2 shadow-md overflow-hidden ${
            overdueInvoices.length > 0
              ? 'border-red-400'
              : unpaidInvoices.length > 0
              ? 'border-emerald-400'
              : 'border-emerald-200'
          }`}>
            {/* header */}
            <div className={`px-6 py-4 flex items-center justify-between ${
              overdueInvoices.length > 0 ? 'bg-red-600' : 'bg-emerald-600'
            } text-white`}>
              <div className="flex items-center gap-3">
                <Receipt className="h-6 w-6" />
                <div>
                  <h2 className="text-base font-bold">Invoices</h2>
                  <p className="text-xs opacity-80 mt-0.5">
                    {unpaidInvoices.length > 0
                      ? `${unpaidInvoices.length} invoice${unpaidInvoices.length !== 1 ? 's' : ''} outstanding`
                      : 'All invoices paid — you\'re all set!'}
                  </p>
                </div>
              </div>
              <Link
                href="/client-portal/invoices"
                className="flex items-center gap-1 text-sm font-semibold bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-colors"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="bg-white px-6 py-4">
              {overdueInvoices.length > 0 && (
                <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
                  <span>
                    <strong>{overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''}</strong> — please pay immediately to avoid disruptions.
                  </span>
                </div>
              )}

              {invoices.length === 0 ? (
                <p className="text-gray-400 text-sm py-4 text-center">No invoices yet. They'll appear here once your coordinator sends them.</p>
              ) : (
                <div className="space-y-3">
                  {unpaidInvoices.slice(0, 3).map((inv: any) => {
                    const overdue = overdueInvoices.includes(inv)
                    return (
                      <div
                        key={inv.id}
                        className={`flex items-center justify-between p-4 rounded-xl border ${
                          overdue ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Invoice #{inv.invoice_number}</p>
                          {inv.due_date && (
                            <p className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? 'text-red-600' : 'text-gray-500'}`}>
                              <Clock className="h-3 w-3" />
                              Due {new Date(inv.due_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              {overdue && ' (OVERDUE)'}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${overdue ? 'text-red-600' : 'text-emerald-700'}`}>
                            ${Number(inv.amount_due ?? inv.total_amount ?? 0).toFixed(2)}
                          </p>
                          <span className="text-xs text-gray-400">due</span>
                        </div>
                      </div>
                    )
                  })}

                  {/* Paid invoices summary */}
                  {unpaidInvoices.length === 0 && invoices.filter((i: any) => i.status === 'paid').length > 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-green-200 bg-green-50">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <p className="text-sm text-green-800 font-medium">
                        All {invoices.filter((i: any) => i.status === 'paid').length} invoice{invoices.filter((i: any) => i.status === 'paid').length !== 1 ? 's' : ''} paid. Nice work!
                      </p>
                    </div>
                  )}

                  {/* Balance due total */}
                  {totalDue > 0 && (
                    <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                      <span className="text-sm font-semibold text-gray-700">Total Balance Due</span>
                      <span className={`text-xl font-bold ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        ${totalDue.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={<Calendar className="h-5 w-5 text-primary-600" />}
              label="Bookings"
              value={data?.bookings.length ?? 0}
              href="/client-portal/events"
              bg="bg-primary-50"
            />
            <StatCard
              icon={<FileText className="h-5 w-5 text-purple-600" />}
              label="Contracts"
              value={data?.contracts.length ?? 0}
              href="/client-portal/contracts"
              bg="bg-purple-50"
            />
            <StatCard
              icon={<FileText className="h-5 w-5 text-blue-600" />}
              label="Estimates"
              value={data?.estimates.length ?? 0}
              href="/client-portal/estimates"
              bg="bg-blue-50"
            />
            <StatCard
              icon={<Receipt className="h-5 w-5 text-emerald-600" />}
              label="Invoices"
              value={invoices.length}
              href="/client-portal/invoices"
              bg="bg-emerald-50"
            />
          </div>

          {/* Upcoming Events */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-500" />
                Upcoming Events
              </h2>
              <Link href="/client-portal/events" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {upcoming.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">No upcoming events.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcoming.map((b: any) => (
                  <li key={b.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{b.event?.name ?? 'Event'}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {b.event?.date ? new Date(b.event.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                        {b.event?.start_time ? ` · ${b.event.start_time}` : ''}
                      </p>
                      {b.event?.venue && <p className="text-xs text-gray-400">{b.event.venue}</p>}
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[b.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {b.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <QuickLink href="/client-portal/invoices"      icon={<Receipt className="h-5 w-5" />}        label="Invoices"             desc="View & track your invoices"   color="text-emerald-600 bg-emerald-50" />
            <QuickLink href="/client-portal/contracts"     icon={<FileText className="h-5 w-5" />}       label="Contracts"            desc="Review & sign documents"      color="text-purple-600 bg-purple-50" />
            <QuickLink href="/client-portal/estimates"     icon={<FileText className="h-5 w-5" />}       label="Estimates"            desc="View your cost estimates"     color="text-indigo-600 bg-indigo-50" />
            <QuickLink href="/client-portal/vendors"       icon={<Store className="h-5 w-5" />}          label="Booked Vendors"       desc="See who's working your event" color="text-orange-600 bg-orange-50" />
            <QuickLink href="/client-portal/messages"      icon={<MessageSquare className="h-5 w-5" />}  label="Messages"             desc="Chat with your event team"    color="text-blue-600 bg-blue-50" />
            <QuickLink href="/client-portal/notifications" icon={<Bell className="h-5 w-5" />}           label="Notifications"        desc="Your latest updates"          color="text-rose-600 bg-rose-50" />
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  href,
  bg,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  href: string
  bg: string
}) {
  return (
    <Link href={href} className={`rounded-xl p-4 ${bg} flex flex-col gap-2 hover:opacity-90 transition-opacity`}>
      <div className="flex items-center justify-between">
        {icon}
        <ChevronRight className="h-4 w-4 text-gray-400" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs font-medium text-gray-500">{label}</p>
    </Link>
  )
}

function QuickLink({
  href,
  icon,
  label,
  desc,
  color,
}: {
  href: string
  icon: React.ReactNode
  label: string
  desc: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        <p className="text-xs text-gray-500 truncate">{desc}</p>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 text-gray-300 flex-shrink-0" />
    </Link>
  )
}
