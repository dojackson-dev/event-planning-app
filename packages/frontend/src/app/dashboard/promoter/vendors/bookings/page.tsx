'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Store, Loader2, MapPin, Calendar, DollarSign, ChevronRight } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  paid: 'bg-purple-100 text-purple-800',
}

const CATEGORY_LABELS: Record<string, string> = {
  dj: 'DJ',
  decorator: 'Decorator',
  planner_coordinator: 'Planner / Coordinator',
  furniture: 'Furniture',
  photographer: 'Photographer',
  musicians: 'Musicians',
  mc_host: 'MC / Host',
  graphic_designer: 'Graphic Designer',
  other: 'Other',
}

interface VendorBooking {
  id: string
  event_name: string
  event_date: string | null
  venue_name: string | null
  agreed_amount: number | null
  status: string
  created_at: string
  notes: string | null
  vendor_accounts: {
    id: string
    business_name: string
    category: string
    profile_image_url: string | null
    phone: string | null
    email: string | null
  } | null
}

export default function PromoterVendorBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<VendorBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/vendors/bookings/booked-by-me')
      .then(res => setBookings(res.data || []))
      .catch(() => setError('Failed to load vendor bookings'))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = bookings.filter(b => b.event_date && new Date(b.event_date) >= new Date() && b.status !== 'cancelled')
  const past = bookings.filter(b => !b.event_date || new Date(b.event_date) < new Date() || b.status === 'cancelled')

  const BookingCard = ({ b }: { b: VendorBooking }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {b.vendor_accounts?.profile_image_url ? (
          <img src={b.vendor_accounts.profile_image_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <Store className="w-6 h-6 text-purple-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-gray-900 text-sm truncate">{b.vendor_accounts?.business_name ?? 'Vendor'}</h3>
          <span className="text-xs text-gray-500">{CATEGORY_LABELS[b.vendor_accounts?.category ?? ''] ?? b.vendor_accounts?.category}</span>
        </div>
        <p className="text-sm text-gray-700 mt-0.5 truncate">{b.event_name}</p>
        <div className="flex flex-wrap gap-3 mt-1">
          {b.event_date && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3.5 h-3.5" />{new Date(b.event_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
          {b.venue_name && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5" />{b.venue_name}
            </span>
          )}
          {b.agreed_amount != null && (
            <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
              <DollarSign className="w-3.5 h-3.5" />{Number(b.agreed_amount).toLocaleString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {b.status}
        </span>
        <button
          onClick={() => router.push(`/dashboard/promoter/vendors/${b.vendor_accounts?.id}`)}
          className="text-gray-400 hover:text-purple-600"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  return (
    <div className="bg-gray-50">
      {/* Page Title Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">My Vendor Bookings</h1>
          <button
            onClick={() => router.push('/dashboard/promoter/vendors')}
            className="px-4 py-2 bg-white text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-50"
          >
            + Book a Vendor
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No vendor bookings yet</h3>
            <p className="text-sm text-gray-500 mb-6">Browse vendors and send your first booking request</p>
            <button
              onClick={() => router.push('/dashboard/promoter/vendors')}
              className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-xl text-sm hover:bg-purple-700"
            >
              Browse Vendors
            </button>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Upcoming</h2>
                {upcoming.map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            )}
            {past.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Past / Cancelled</h2>
                {past.map(b => <BookingCard key={b.id} b={b} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
