'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Booking, ClientStatus } from '@/types'
import { Eye, Download, Mail, RefreshCw, XCircle, Search } from 'lucide-react'
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
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'deposit_paid' | 'completed'>('all')
  const [searchTerm, setSearchTerm] = useState('')

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
      await api.patch(`/bookings/${bookingId}`, { client_status: newStatus })
      // Refresh bookings
      fetchBookings()
    } catch (error) {
      console.error('Failed to update client status:', error)
    }
  }

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this booking? The client will be notified.')) return
    try {
      await api.patch(`/bookings/${bookingId}/cancel`)
      fetchBookings()
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to cancel booking.'
      alert(msg)
    }
  }

  const resendConfirmation = async (bookingId: string) => {
    try {
      await api.patch(`/bookings/${bookingId}/resend-confirmation`)
      alert('Event notification resent to client.')
      fetchBookings()
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to resend notification.'
      alert(msg)
    }
  }

  // A booking is an event with deposit paid or complete balance paid
  const filteredBookings = bookings
    .filter(b => filter === 'all' || (b.client_status ?? b.clientStatus) === filter)
    .filter(b => {
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      const name = (b.contact_name || (b.user ? `${b.user.firstName} ${b.user.lastName}` : '')).toLowerCase()
      const eventName = (b.event?.name || '').toLowerCase()
      return name.includes(q) || eventName.includes(q) || (b.contact_email || '').toLowerCase().includes(q)
    })

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
      </div>

      {/* Search + Filter — Bookings = events with deposit paid or full balance paid */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by client name or event..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | 'deposit_paid' | 'completed')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Bookings</option>
          <option value="deposit_paid">Deposit Paid</option>
          <option value="completed">Balance Paid</option>
        </select>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No bookings found</div>
        ) : (
          filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer active:bg-gray-50 hover:shadow-md transition-shadow ${(booking.client_status ?? booking.clientStatus) === 'cancelled' ? 'opacity-60' : ''}`}
              onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {booking.contact_name || (booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'N/A')}
                  </p>
                  <p className="text-sm text-gray-600 truncate">{booking.event?.name || 'N/A'}</p>
                </div>
                <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
                  (booking.client_status ?? booking.clientStatus) === 'completed' ? 'bg-green-100 text-green-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {(booking.client_status ?? booking.clientStatus) === 'completed' ? 'Balance Paid' : 'Deposit Paid'}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                <span>${booking.totalPrice?.toFixed(2) ?? '0.00'} total</span>
                <span>·</span>
                <span>${booking.totalAmountPaid?.toFixed(2) ?? '0.00'} paid</span>
                {booking.client_confirmation_status && (
                  <>
                    <span>·</span>
                    <span className={`capitalize ${
                      booking.client_confirmation_status === 'confirmed' ? 'text-green-600' :
                      booking.client_confirmation_status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {booking.client_confirmation_status}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center" onClick={e => e.stopPropagation()}>
                <span className="text-xs text-gray-400">Tap to view details →</span>
                <div className="flex gap-1">
                  {(booking.client_status ?? booking.clientStatus) !== 'cancelled' && (
                    <button
                      onClick={() => cancelBooking(booking.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Cancel booking"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                  {booking.client_confirmation_status === 'rejected' && (
                    <button
                      onClick={() => resendConfirmation(booking.id)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Resend notification"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
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
                  Payment Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client Confirm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings.map((booking) => (
                <tr
                  key={booking.id}
                  className={`hover:bg-gray-50 cursor-pointer ${(booking.client_status ?? booking.clientStatus) === 'cancelled' ? 'opacity-60' : ''}`}
                  onClick={() => router.push(`/dashboard/bookings/${booking.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {booking.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.event?.name || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
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
                      (booking.client_status ?? booking.clientStatus) === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}>
                      {(booking.client_status ?? booking.clientStatus) === 'completed' ? 'Balance Paid' : 'Deposit Paid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${booking.totalPrice?.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${booking.totalAmountPaid?.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {booking.client_confirmation_status ? (
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        booking.client_confirmation_status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : booking.client_confirmation_status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.client_confirmation_status}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2 items-center">
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
                      {(booking.client_status ?? booking.clientStatus) !== 'cancelled' && (
                        <button
                          onClick={() => cancelBooking(booking.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel Booking"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      )}
                      {booking.client_confirmation_status === 'rejected' && (
                        <button
                          onClick={() => resendConfirmation(booking.id)}
                          className="text-amber-600 hover:text-amber-800"
                          title="Resend event notification to client"
                        >
                          <RefreshCw className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredBookings.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-sm text-gray-500">
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
