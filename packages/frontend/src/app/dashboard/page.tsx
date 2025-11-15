'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Event, Booking, ClientStatus } from '@/types'
import { Calendar, Users, DollarSign, CheckCircle } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    totalBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    pendingPayments: 0,
  })
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
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

      setStats({
        totalEvents: events.length,
        upcomingEvents: upcomingEvents.length,
        totalBookings: bookings.length,
        pendingBookings: pendingBookings.length,
        totalRevenue,
        pendingPayments,
      })

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
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Total Revenue</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Collected</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <DollarSign className="h-8 w-8 sm:h-10 sm:w-10 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">Pending Payments</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">${stats.pendingPayments.toFixed(2)}</p>
              <p className="text-xs text-gray-500 mt-1">Outstanding</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-orange-600" />
            </div>
          </div>
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
                    ${booking.totalPrice.toFixed(2)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                    ${booking.totalAmountPaid.toFixed(2)}
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
