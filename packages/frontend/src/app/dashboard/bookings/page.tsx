'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Booking, ClientStatus, BookingStatus } from '@/types'
import { Eye, Download, Mail } from 'lucide-react'
import { format } from 'date-fns'

const clientStatusLabels: Record<ClientStatus, string> = {
  [ClientStatus.CONTACTED_BY_PHONE]: 'Contacted by Phone',
  [ClientStatus.WALKTHROUGH_COMPLETED]: 'Walkthrough Completed',
  [ClientStatus.BOOKED]: 'Booked',
  [ClientStatus.DEPOSIT_PAID]: 'Deposit Paid',
  [ClientStatus.COMPLETED]: 'Completed',
  [ClientStatus.CANCELLED]: 'Cancelled',
}

const clientStatusColors: Record<ClientStatus, string> = {
  [ClientStatus.CONTACTED_BY_PHONE]: 'bg-gray-100 text-gray-800',
  [ClientStatus.WALKTHROUGH_COMPLETED]: 'bg-blue-100 text-blue-800',
  [ClientStatus.BOOKED]: 'bg-yellow-100 text-yellow-800',
  [ClientStatus.DEPOSIT_PAID]: 'bg-purple-100 text-purple-800',
  [ClientStatus.COMPLETED]: 'bg-green-100 text-green-800',
  [ClientStatus.CANCELLED]: 'bg-red-100 text-red-800',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | BookingStatus>('all')

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    try {
      const response = await api.get<Booking[]>('/bookings')
      setBookings(response.data)
    } catch (error) {
      console.error('Failed to fetch bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateClientStatus = async (bookingId: string, newStatus: ClientStatus) => {
    try {
      await api.patch(`/bookings/${bookingId}`, { clientStatus: newStatus })
      // Refresh bookings
      fetchBookings()
    } catch (error) {
      console.error('Failed to update client status:', error)
    }
  }

  const filteredBookings = filter === 'all' 
    ? bookings 
    : bookings.filter(b => b.status === filter)

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter(BookingStatus.PENDING)}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === BookingStatus.PENDING
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter(BookingStatus.CONFIRMED)}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === BookingStatus.CONFIRMED
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Confirmed
        </button>
        <button
          onClick={() => setFilter(BookingStatus.CANCELLED)}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === BookingStatus.CANCELLED
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Cancelled
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.event?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={booking.clientStatus}
                      onChange={(e) => updateClientStatus(booking.id, e.target.value as ClientStatus)}
                      className={`text-xs px-2 py-1 rounded-full font-semibold ${clientStatusColors[booking.clientStatus]}`}
                    >
                      {Object.entries(clientStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      booking.status === BookingStatus.CONFIRMED
                        ? 'bg-green-100 text-green-800'
                        : booking.status === BookingStatus.PENDING
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${booking.totalPrice?.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${booking.totalAmountPaid?.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/bookings/${booking.id}`}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        title="Download Contract"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                      <button
                        className="text-green-600 hover:text-green-900"
                        title="Send Email"
                      >
                        <Mail className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No bookings found
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
