'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Event, Booking, ClientStatus } from '@/types'
import { Calendar, Users, DollarSign, CheckCircle, Clock, ArrowRight, UserPlus, Mail, Phone } from 'lucide-react'

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
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
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

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch events
      const eventsRes = await api.get<Event[]>('/events')
      const events = eventsRes.data
      const upcomingEvents = events.filter(e => new Date(e.date) >= new Date())

      // Fetch bookings
      const bookingsRes = await api.get<Booking[]>('/bookings')
      const bookings = bookingsRes.data
      const pendingBookings = bookings.filter(b => b.status === 'pending')
      
      // Calculate revenue
      const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalAmountPaid || 0), 0)
      const pendingPayments = bookings.reduce((sum, b) => {
        const remaining = b.totalPrice - (b.totalAmountPaid || 0)
        return sum + (remaining > 0 ? remaining : 0)
      }, 0)

      // Fetch intake forms (clients)
      const clientsRes = await api.get<IntakeForm[]>('/intake-forms')
      const clients = clientsRes.data
      const newClients = clients.filter(c => c.status === 'new')

      setStats({
        totalEvents: events.length,
        upcomingEvents: upcomingEvents.length,
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
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
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">
        Welcome back, {user?.firstName}!
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Events</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.upcomingEvents} upcoming</p>
            </div>
            <div className="bg-primary-50 p-3 rounded-lg">
              <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Bookings</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalBookings}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.pendingBookings} pending</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Users className="h-8 w-8 sm:h-10 sm:w-10 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">New Clients</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalClients}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.newClients} new leads</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <UserPlus className="h-8 w-8 sm:h-10 sm:w-10 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100">
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
        </div>
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
                        {booking.event?.date ? new Date(booking.event.date).toLocaleDateString() : 'Date TBD'}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1.5" />
                        {booking.event?.maxGuests || 0} guests
                      </div>
                      <div className="flex items-center font-medium text-gray-900">
                        <DollarSign className="h-4 w-4 mr-1" />
                        ${booking.totalPrice.toFixed(2)}
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
                        {new Date(client.event_date).toLocaleDateString()}
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
