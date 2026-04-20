'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Event, Booking, ClientStatus, Invoice, InvoiceStatus } from '@/types'
import { Calendar, Users, DollarSign, CheckCircle, Clock, ArrowRight, UserPlus, Mail, Phone, AlertCircle, Building2 } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'
import SetupChecklist from '@/components/SetupChecklist'
import TrialBanner from '@/components/TrialBanner'
import DemoTour from '@/components/DemoTour'
import { useVenue } from '@/contexts/VenueContext'

interface IntakeForm {
  id: string
  contact_name: string
  contact_email: string
  contact_phone: string
  event_type: string
  event_date: string
  guest_count: number
  status: string
  created_at: string
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { venues, activeVenue } = useVenue()
  const [stats, setStats] = useState({
    unpaidInvoices: 0,
    unpaidAmount: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    totalClients: 0,
    newClients: 0,
  })
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [recentClients, setRecentClients] = useState<IntakeForm[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [intakeSlug, setIntakeSlug] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    fetchDashboardData()
  }, [authLoading, user, activeVenue])

  useEffect(() => {
    if (!user?.id) return
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/intake-forms/public-form/${user.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.intakeSlug) setIntakeSlug(data.intakeSlug) })
      .catch(() => {})
  }, [user?.id])

  const fetchDashboardData = async () => {
    try {
      // Fetch events
      const venueParams = activeVenue ? { venueId: activeVenue.id } : {}
      const eventsRes = await api.get<Event[]>('/events', { params: venueParams }).catch(() => ({ data: [] as Event[] }))
      const events = eventsRes.data

      // Fetch invoices for unpaid count
      const invoicesRes = await api.get<Invoice[]>('/invoices').catch(() => ({ data: [] as Invoice[] }))
      const invoices = invoicesRes.data
      // Count all invoices where money is still owed (any status except paid/cancelled)
      const unpaidInvoices = invoices.filter(inv =>
        inv.status !== InvoiceStatus.PAID &&
        inv.status !== InvoiceStatus.CANCELLED &&
        Number(inv.amount_due ?? 0) > 0
      )
      const unpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + Number(inv.amount_due ?? 0), 0)

      // Fetch bookings (gracefully handle missing table)
      const bookingsRes = await api.get<Booking[]>('/bookings').catch(() => ({ data: [] as Booking[] }))
      const bookings = bookingsRes.data
      // Count events where a deposit amount > 0 was charged (confirmed bookings)
      const paidDepositBookings = bookings.filter(b =>
        Number((b as any).deposit_amount ?? b.deposit ?? 0) > 0
      )
      const completedBookings = bookings.filter(b => (b as any).client_status === 'completed')
      
      // Calculate revenue from invoices (captures paid standalone invoices, not just booking payments)
      const totalRevenue = invoices.reduce((sum, inv) => {
        return sum + Number((inv as any).amount_paid ?? (inv as any).amountPaid ?? 0)
      }, 0)
      // Pending payments = all unpaid/outstanding invoice amounts
      const pendingPayments = invoices
        .filter(inv => inv.status !== InvoiceStatus.PAID && inv.status !== InvoiceStatus.CANCELLED)
        .reduce((sum, inv) => sum + Number((inv as any).amount_due ?? (inv as any).amountDue ?? 0), 0)

      // Fetch intake forms (clients)
      const clientsRes = await api.get<IntakeForm[]>('/intake-forms')
      const clients = clientsRes.data
      const newClients = clients.filter(c => c.status === 'new')

      setStats({
        unpaidInvoices: unpaidInvoices.length,
        unpaidAmount,
        totalBookings: paidDepositBookings.length,
        pendingBookings: completedBookings.length,
        totalRevenue,
        pendingPayments,
        totalClients: clients.length,
        newClients: newClients.length,
      })

      // Get recent clients (last 5)
      const sortedClients = [...clients].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setRecentClients(sortedClients.slice(0, 5))

      // Get upcoming bookings (next 7 days)
      const now = new Date()
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const upcoming = bookings
        .filter(b => {
          const bookingDate = new Date(b.event?.date || b.createdAt)
          return bookingDate >= now && bookingDate <= weekFromNow && b.status !== 'cancelled'
        })
        .sort((a, b) => {
          const dateA = new Date(a.event?.date || a.createdAt)
          const dateB = new Date(b.event?.date || b.createdAt)
          return dateA.getTime() - dateB.getTime()
        })
        .slice(0, 5)

      setUpcomingBookings(upcoming)

      // Get recent bookings
      setRecentBookings(bookings.slice(0, 5))
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getClientStatusLabel = (status: ClientStatus): string => {
    const labels: Record<ClientStatus, string> = {
      [ClientStatus.CONTACTED_BY_PHONE]: 'Contacted',
      [ClientStatus.WALKTHROUGH_COMPLETED]: 'Walkthrough Done',
      [ClientStatus.BOOKED]: 'Booked',
      [ClientStatus.DEPOSIT_PAID]: 'Deposit Paid',
      [ClientStatus.COMPLETED]: 'Completed',
      [ClientStatus.CANCELLED]: 'Cancelled',
    }
    return labels[status] || status
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <DemoTour />

      <div className="flex items-center justify-between mb-6 sm:mb-8 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {user?.firstName}!
          </h1>
          {venues.length > 1 && (
            <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {activeVenue ? activeVenue.name : 'All Venues'}
            </p>
          )}
        </div>
        <button
          onClick={() => (window as any).__openDemoTour?.()}
          className="flex-shrink-0 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          Take a tour
        </button>
      </div>

      {/* Trial conversion banner */}
      <TrialBanner />

      {/* Setup checklist — hidden once all steps are complete */}
      <SetupChecklist />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Link href="/dashboard/invoices" className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 hover:shadow-md hover:border-red-200 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Unpaid Invoices</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.unpaidInvoices}</p>
              <p className="text-xs text-gray-500 mt-1">${stats.unpaidAmount.toFixed(2)} outstanding</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/bookings" className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 hover:shadow-md hover:border-green-200 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Bookings</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.pendingBookings} completed</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/clients" className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">New Leads</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalClients}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.newClients} new leads</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <UserPlus className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600" />
            </div>
          </div>
        </Link>

        <Link href="/dashboard/invoices" className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Collected</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Upcoming Bookings - Next 7 Days */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-primary-600 mr-2" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Upcoming This Week</h2>
          </div>
          <Link 
            href="/dashboard/bookings"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => (
              <div key={booking.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {booking.event?.name || 'Event'}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Client: {booking.user?.firstName} {booking.user?.lastName}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
                        booking.clientStatus === ClientStatus.DEPOSIT_PAID
                          ? 'bg-green-100 text-green-800'
                          : booking.clientStatus === ClientStatus.BOOKED
                          ? 'bg-blue-100 text-blue-800'
                          : booking.clientStatus === ClientStatus.WALKTHROUGH_COMPLETED
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {getClientStatusLabel(booking.clientStatus)}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1.5" />
                        {booking.event?.date ? parseLocalDate(booking.event.date).toLocaleDateString() : 'Date TBD'}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1.5" />
                        {booking.event?.maxGuests || 0} guests
                      </div>
                      <div className="flex items-center font-medium text-gray-900">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${booking.totalPrice?.toFixed(2) || '0.00'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <Link
                      href={`/dashboard/bookings`}
                      className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      View Details
                    </Link>
                    {booking.totalAmountPaid < booking.totalPrice && (
                      <span className="text-xs text-orange-600 font-medium">
                        ${(booking.totalPrice - booking.totalAmountPaid).toFixed(2)} due
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No upcoming bookings in the next 7 days</p>
            </div>
          )}
        </div>
      </div>
      {/* Share Client Intake Form */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm p-5 mb-6 sm:mb-8 text-white">
        <h2 className="text-base font-bold mb-1">Share Your Client Intake Form</h2>
        <p className="text-blue-100 text-sm mb-3">Send this link to clients to collect event details automatically.</p>
        <div className="flex items-center gap-2 bg-white/10 border border-white/30 rounded-lg px-3 py-2">
          <span className="flex-1 text-sm font-mono truncate select-all">
            dovenuesuite.com/intake/{intakeSlug ?? user?.id}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(`https://dovenuesuite.com/intake/${intakeSlug ?? user?.id}`)
              setCopied(true)
              setTimeout(() => setCopied(false), 2000)
            }}
            className="flex-shrink-0 px-4 py-1.5 bg-white text-blue-700 rounded-md font-semibold text-sm hover:bg-blue-50 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Quick Vendor Booking Link */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-sm p-6 mb-6 sm:mb-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-bold mb-2">Need to book vendors for an event?</h2>
            <p className="text-purple-100 text-sm mb-4">
              Find and book DJs, photographers, decorators, planners, musicians, and more from our vendor directory.
            </p>
          </div>
        </div>
        <Link
          href="/vendors"
          className="inline-flex items-center px-6 py-2.5 bg-white text-purple-700 rounded-lg font-semibold text-sm hover:bg-purple-50 transition-colors"
        >
          Browse Vendors
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </div>
      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center">
            <UserPlus className="h-5 w-5 text-purple-600 mr-2" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Client Inquiries</h2>
          </div>
          <Link 
            href="/dashboard/clients"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {recentClients.length > 0 ? (
            recentClients.map((client) => (
              <div key={client.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">
                          {client.contact_name}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {client.event_type.charAt(0).toUpperCase() + client.event_type.slice(1).replace('_', ' ')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ml-2 ${
                        client.status === 'new'
                          ? 'bg-blue-100 text-blue-800'
                          : client.status === 'contacted'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {client.status}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-1.5" />
                        {client.contact_email}
                      </div>
                      {client.contact_phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1.5" />
                          {client.contact_phone}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1.5" />
                        {new Date(client.event_date + 'T12:00:00').toLocaleDateString()}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1.5" />
                        {client.guest_count} guests
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/clients/${client.id}`}
                      className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              <UserPlus className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No client inquiries yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Recent Bookings</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking ID
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client Status
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Amount Paid
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span className="sm:hidden">{booking.id.slice(0, 6)}...</span>
                    <span className="hidden sm:inline">{booking.id}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">
                    <span className="text-xs sm:text-sm">{getClientStatusLabel(booking.clientStatus)}</span>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${booking.totalPrice?.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                    ${booking.totalAmountPaid?.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      booking.status === 'confirmed' 
                        ? 'bg-green-100 text-green-800' 
                        : booking.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-sm text-gray-500">
                    No bookings yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
