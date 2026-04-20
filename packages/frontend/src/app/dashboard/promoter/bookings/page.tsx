'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Plus, Loader2, Calendar, User, Megaphone } from 'lucide-react'

interface PromoterBooking {
  id: string
  event_name: string
  client_name: string
  client_email: string
  event_date?: string
  event_start_time?: string
  venue_name?: string
  agreed_amount?: number
  deposit_amount?: number
  status: 'inquiry' | 'estimate_sent' | 'deposit_paid' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
  promoter_invoice_id?: string
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-gray-100 text-gray-700',
  estimate_sent: 'bg-blue-100 text-blue-700',
  deposit_paid: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  estimate_sent: 'Estimate Sent',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function PromoterBookingsPage() {
  const [bookings, setBookings] = useState<PromoterBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/promoter-bookings/mine')
      .then(r => setBookings(r.data || []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load bookings'))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled')
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/promoter" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <span className="text-sm font-semibold text-gray-800">Bookings</span>
          </div>
          <Link href="/dashboard/promoter/bookings/new"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Booking
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No bookings yet</h3>
            <p className="text-sm text-gray-500 mb-4">Track your event bookings here.</p>
            <Link href="/dashboard/promoter/bookings/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Booking
            </Link>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Upcoming ({upcoming.length})</h2>
                <div className="space-y-3">
                  {upcoming.map(b => (
                    <Link key={b.id} href={`/dashboard/promoter/bookings/${b.id}`}
                      className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{b.event_name}</h3>
                            <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                              {STATUS_LABELS[b.status]}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{b.client_name}</span>
                            {b.event_date && (
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.event_date}
                                {b.event_start_time && ` at ${b.event_start_time}`}
                              </span>
                            )}
                            {b.venue_name && <span>{b.venue_name}</span>}
                          </div>
                        </div>
                        {b.agreed_amount && (
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-gray-900">${Number(b.agreed_amount).toFixed(0)}</p>
                            {b.deposit_amount && <p className="text-xs text-gray-400">${Number(b.deposit_amount).toFixed(0)} deposit</p>}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past ({past.length})</h2>
                <div className="space-y-3">
                  {past.map(b => (
                    <Link key={b.id} href={`/dashboard/promoter/bookings/${b.id}`}
                      className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow opacity-70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">{b.event_name}</h3>
                            <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                              {STATUS_LABELS[b.status]}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" />{b.client_name}</span>
                            {b.event_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{b.event_date}</span>}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
