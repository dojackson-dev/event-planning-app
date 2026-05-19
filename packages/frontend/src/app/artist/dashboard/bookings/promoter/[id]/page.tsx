'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Loader2, Calendar, User, Building2, MapPin, DollarSign, FileText, CheckCircle, XCircle } from 'lucide-react'

interface PromoterBooking {
  id: string
  event_name: string
  event_date?: string
  event_start_time?: string
  event_end_time?: string
  venue_name?: string
  venue_address?: string
  agreed_amount?: number
  deposit_amount?: number
  notes?: string
  status: string
  artist_status?: string
  promoter_accounts?: {
    company_name?: string
    contact_name?: string
    email?: string
    phone?: string
  }
}

const STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-gray-100 text-gray-700',
  estimate_sent: 'bg-blue-100 text-blue-700',
  deposit_paid: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  completed: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-red-100 text-red-600',
  pending: 'bg-orange-100 text-orange-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-600',
}

const STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  estimate_sent: 'Estimate Sent',
  deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
}

export default function PromoterBookingDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [booking, setBooking] = useState<PromoterBooking | null>(null)
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/promoter-bookings/${id}`)
      .then(res => setBooking(res.data))
      .catch(() => setError('Booking not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handleRespond = async (action: 'accept' | 'decline') => {
    setResponding(true); setError('')
    try {
      const res = await api.patch(`/promoter-bookings/${id}/artist-respond`, { action })
      setBooking(res.data)
    } catch (e: any) {
      setError(e.response?.data?.message || `Failed to ${action} booking`)
    } finally {
      setResponding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-600">{error}</p>
        <Link href="/artist/dashboard/bookings" className="text-blue-600 text-sm hover:underline">← Back to Bookings</Link>
      </div>
    )
  }

  const promoterName = booking?.promoter_accounts?.company_name || booking?.promoter_accounts?.contact_name || 'Promoter'
  const formattedDate = booking?.event_date
    ? new Date(booking.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/artist/dashboard/bookings" className="text-sm text-gray-500 hover:text-gray-700">← Bookings</Link>
            <span className="text-sm font-semibold text-gray-800 truncate max-w-[180px]">{booking?.event_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              <Building2 className="w-3 h-3" /> {promoterName}
            </span>
            {booking?.status && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'}`}>
                {STATUS_LABELS[booking.status] || booking.status}
              </span>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {/* Artist respond banner */}
        {booking?.artist_status === 'pending' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm font-medium text-orange-900 mb-3">
              {promoterName} has sent you a booking request. Do you accept?
            </p>
            <div className="flex gap-3">
              <button onClick={() => handleRespond('accept')} disabled={responding}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                {responding ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Accept
              </button>
              <button onClick={() => handleRespond('decline')} disabled={responding}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
                <XCircle className="w-4 h-4" /> Decline
              </button>
            </div>
          </div>
        )}

        {booking?.artist_status && booking.artist_status !== 'pending' && (
          <div className={`rounded-xl p-3 text-sm font-medium flex items-center gap-2 ${
            booking.artist_status === 'accepted' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {booking.artist_status === 'accepted' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            You {booking.artist_status} this booking request
          </div>
        )}

        {/* Event Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Event Details</h2>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900">{booking?.event_name}</h3>
            {formattedDate && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{formattedDate}
                  {booking?.event_start_time && ` at ${booking.event_start_time}`}
                  {booking?.event_end_time && ` – ${booking.event_end_time}`}
                </span>
              </div>
            )}
            {booking?.venue_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span>{booking.venue_name}{booking.venue_address ? `, ${booking.venue_address}` : ''}</span>
              </div>
            )}
          </div>
        </div>

        {/* Promoter Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-gray-800">Booked By</h2>
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Building2 className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{promoterName}</span>
          </div>
          {booking?.promoter_accounts?.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${booking.promoter_accounts.email}`} className="hover:underline text-blue-600">
                {booking.promoter_accounts.email}
              </a>
            </div>
          )}
        </div>

        {/* Financials */}
        {(booking?.agreed_amount || booking?.deposit_amount) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
            <h2 className="font-semibold text-gray-800">Financials</h2>
            {booking?.agreed_amount && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><DollarSign className="w-4 h-4" />Agreed Amount</span>
                <span className="font-semibold text-gray-900">${Number(booking.agreed_amount).toFixed(2)}</span>
              </div>
            )}
            {booking?.deposit_amount && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><DollarSign className="w-4 h-4" />Deposit</span>
                <span className="font-semibold text-gray-900">${Number(booking.deposit_amount).toFixed(2)}</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {booking?.notes && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-800">Notes</h2>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{booking.notes}</p>
          </div>
        )}

        <p className="text-xs text-center text-gray-400 pb-4">
          This booking was created by the promoter — contact them directly to request changes.
        </p>
      </div>
    </div>
  )
}
