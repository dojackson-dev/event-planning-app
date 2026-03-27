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
  Package,
  Bell,
  ChevronRight,
  CheckCircle2,
  Clock,
  DollarSign,
} from 'lucide-react'

interface OverviewData {
  bookings: any[]
  contracts: any[]
  estimates: any[]
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
    .filter((b: any) => b.event?.date && new Date(b.event.date) >= new Date())
    .slice(0, 3)

  const totalDue = (data?.bookings ?? []).reduce((sum: number, b: any) => {
    const price = Number(b.total_amount ?? 0)
    if (!price) return sum
    if (b.payment_status === 'paid') return sum
    if (b.payment_status === 'deposit_paid') return sum + price - Number(b.deposit_amount ?? 0)
    return sum + price // unpaid or partially_paid
  }, 0)

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-primary-600 text-white px-8 py-6">
        <h1 className="text-2xl font-bold">
          Welcome back, {client?.firstName}!
        </h1>
        <p className="mt-1 text-primary-100 text-sm">
          Here's everything you need to know about your upcoming events.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-500">Loading your information...</div>
      ) : (
        <>
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
              icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
              label="Balance Due"
              value={`$${totalDue.toFixed(2)}`}
              href="/client-portal/events"
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
                        {b.event?.date ? new Date(b.event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
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
            <QuickLink href="/client-portal/vendors"       icon={<Store className="h-5 w-5" />}         label="Booked Vendors"       desc="See who's working your event" color="text-orange-600 bg-orange-50" />
            <QuickLink href="/client-portal/items"         icon={<Package className="h-5 w-5" />}        label="Items & Packages"     desc="Browse available add-ons"     color="text-teal-600 bg-teal-50" />
            <QuickLink href="/client-portal/messages"      icon={<MessageSquare className="h-5 w-5" />}  label="Messages"             desc="Chat with your event team"    color="text-blue-600 bg-blue-50" />
            <QuickLink href="/client-portal/contracts"     icon={<FileText className="h-5 w-5" />}       label="Contracts"            desc="Review & sign documents"      color="text-purple-600 bg-purple-50" />
            <QuickLink href="/client-portal/estimates"     icon={<FileText className="h-5 w-5" />}       label="Estimates"            desc="View your cost estimates"     color="text-indigo-600 bg-indigo-50" />
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
