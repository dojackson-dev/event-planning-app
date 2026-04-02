'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import VendorNav from '@/components/VendorNav'
import { AlertCircle, CheckCircle2, XCircle, DollarSign } from 'lucide-react'
import type { VendorProfile, Booking } from '@/lib/vendorTypes'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: <AlertCircle className="w-4 h-4" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700 border-green-200',    icon: <CheckCircle2 className="w-4 h-4" /> },
  paid:      { label: 'Paid',      color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <DollarSign className="w-4 h-4" /> },
  declined:  { label: 'Declined',  color: 'bg-red-100 text-red-700 border-red-200',          icon: <XCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-200',       icon: <XCircle className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700 border-blue-200',       icon: <CheckCircle2 className="w-4 h-4" /> },
}

export default function BookingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    const load = async () => {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          api.get('/vendors/account/me'),
          api.get('/vendors/bookings/mine'),
        ])
        setProfile(profileRes.data)
        setBookings(bookingsRes.data || [])
      } catch (err: any) {
        if (err.response?.status === 401) router.replace('/vendors/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const updateBookingStatus = async (bookingId: string, status: string) => {
    setUpdating(bookingId)
    try {
      await api.put(`/vendors/bookings/${bookingId}`, { status })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    } catch (err) {
      console.error(err)
    } finally {
      setUpdating(null)
    }
  }

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter(b => b.status === statusFilter)

  const counts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const revenue = bookings
    .filter(b => b.status === 'paid' || b.status === 'completed')
    .reduce((sum, b) => sum + (b.agreed_amount || 0), 0)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNav profile={profile} currentPage="Bookings" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-bold text-gray-900">Booking Requests</h1>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="declined">Declined</option>
              <option value="completed">Completed</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Pending',   value: String(counts['pending']   || 0), color: 'text-yellow-600' },
              { label: 'Confirmed', value: String(counts['confirmed'] || 0), color: 'text-green-600'  },
              { label: 'Completed', value: String((counts['completed'] || 0) + (counts['paid'] || 0)), color: 'text-blue-600' },
              { label: 'Revenue',   value: `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: 'text-emerald-600' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📭</div>
              <p>No bookings yet.</p>
              <p className="text-sm mt-1">Once owners book you, they&apos;ll appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map(booking => {
                const statusCfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
                return (
                  <div key={booking.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{booking.event_name}</h3>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${statusCfg.color}`}>
                            {statusCfg.icon} {statusCfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          📅 {new Date(booking.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                          {booking.start_time && ` · ${booking.start_time}`}
                          {booking.end_time && ` – ${booking.end_time}`}
                        </p>
                        {booking.venue_name && (
                          <p className="text-sm text-gray-500">📍 {booking.venue_name}</p>
                        )}
                        {booking.agreed_amount > 0 && (
                          <p className="text-sm font-medium text-gray-700 mt-1">
                            💰 ${booking.agreed_amount.toLocaleString()}
                            {booking.deposit_amount > 0 && (
                              <span className="text-xs text-gray-400 font-normal"> (${booking.deposit_amount} deposit)</span>
                            )}
                            {booking.payment_status && (
                              <span className="text-xs text-gray-400 font-normal"> · {booking.payment_status.replace('_', ' ')}</span>
                            )}
                          </p>
                        )}
                        {booking.notes && (
                          <p className="text-sm text-gray-500 italic mt-1">&ldquo;{booking.notes}&rdquo;</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {booking.status === 'pending' && (
                          <>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                              disabled={updating === booking.id}
                              className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                            >
                              ✓ Accept
                            </button>
                            <button
                              onClick={() => updateBookingStatus(booking.id, 'declined')}
                              disabled={updating === booking.id}
                              className="border border-red-300 text-red-600 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50"
                            >
                              ✗ Decline
                            </button>
                          </>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                            disabled={updating === booking.id}
                            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                          >
                            Mark Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
