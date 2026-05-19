'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Calendar, User, Music, Building2, LogOut } from 'lucide-react'
import RoleSwitcher from '@/components/RoleSwitcher'

interface ArtistBooking {
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
  artist_invoice_id?: string
  _source?: 'own' | 'promoter'
  _promoter_name?: string
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

export default function ArtistBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<ArtistBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const handleLogout = () => {
    ;['access_token','refresh_token','user_role','user_roles','active_role'].forEach(k => localStorage.removeItem(k))
    router.push('/artist/login')
  }

  useEffect(() => {
    Promise.allSettled([
      api.get('/artist-bookings/mine'),
      api.get('/promoter-bookings/for-artist'),
    ]).then(([ownRes, pbRes]) => {
      const own: ArtistBooking[] = (ownRes.status === 'fulfilled' ? ownRes.value.data || [] : [])
        .map((b: ArtistBooking) => ({ ...b, _source: 'own' as const }))

      const promoter: ArtistBooking[] = (pbRes.status === 'fulfilled' ? pbRes.value.data || [] : [])
        .map((b: any) => ({
          id: b.id,
          event_name: b.event_name,
          client_name: b.promoter_accounts?.contact_name || b.promoter_accounts?.company_name || 'Promoter',
          client_email: b.promoter_accounts?.email || '',
          event_date: b.event_date,
          event_start_time: b.event_start_time,
          venue_name: b.venue_name,
          agreed_amount: b.agreed_amount,
          deposit_amount: b.deposit_amount,
          status: b.status,
          notes: b.notes,
          _source: 'promoter' as const,
          _promoter_name: b.promoter_accounts?.company_name || b.promoter_accounts?.contact_name || 'Promoter',
        }))

      const all = [...own, ...promoter].sort((a, b) => {
        if (!a.event_date) return 1
        if (!b.event_date) return -1
        return a.event_date.localeCompare(b.event_date)
      })
      setBookings(all)
    }).catch(e => setError('Failed to load bookings'))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled')
  const past = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled')

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/artist/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <span className="text-sm font-semibold text-gray-800">Bookings</span>
          </div>
          <Link href="/artist/dashboard/bookings/new"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Booking
          </Link>
        </div>
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 h-11 flex items-center gap-2">
            <RoleSwitcher variant="banner" />
            <div className="flex-1" />
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Music className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No bookings yet</h3>
            <p className="text-sm text-gray-500 mb-4">Create your first booking to start tracking events.</p>
            <Link href="/artist/dashboard/bookings/new"
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
                    <BookingCard key={b.id} booking={b} />
                  ))}
                </div>
              </section>
            )}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past ({past.length})</h2>
                <div className="space-y-3">
                  {past.map(b => (
                    <BookingCard key={b.id} booking={b} />
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

function BookingCard({ booking }: { booking: ArtistBooking }) {
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h3 className="font-semibold text-gray-900 truncate">{booking.event_name}</h3>
          <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[booking.status]}`}>
            {STATUS_LABELS[booking.status]}
          </span>
          {booking._source === 'promoter' && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
              <Building2 className="w-3 h-3" /> via {booking._promoter_name}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{booking.client_name}</span>
          {booking.event_date && (
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{booking.event_date}
              {booking.event_start_time && ` at ${booking.event_start_time}`}
            </span>
          )}
          {booking.venue_name && <span>{booking.venue_name}</span>}
        </div>
      </div>
      {booking.agreed_amount && (
        <div className="text-right flex-shrink-0">
          <p className="font-semibold text-gray-900">${Number(booking.agreed_amount).toFixed(0)}</p>
          {booking.deposit_amount && (
            <p className="text-xs text-gray-400">${Number(booking.deposit_amount).toFixed(0)} deposit</p>
          )}
        </div>
      )}
    </div>
  )

  if (booking._source === 'promoter') {
    return (
      <Link href={`/artist/dashboard/bookings/promoter/${booking.id}`}
        className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
        {inner}
      </Link>
    )
  }

  return (
    <Link href={`/artist/dashboard/bookings/${booking.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      {inner}
    </Link>
  )
}
