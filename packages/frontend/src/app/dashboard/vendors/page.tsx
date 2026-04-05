'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import Pagination from '@/components/Pagination'
import {
  Search,
  MapPin,
  Star,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Calendar,
  Clock,
  XCircle,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Store,
  CreditCard,
  X,
  Phone,
  Mail,
  Building2,
  FileText,
} from 'lucide-react'

const CATEGORIES = [
  { value: '', label: 'All Categories', icon: '🎪' },
  { value: 'dj', label: 'DJ', icon: '🎧' },
  { value: 'decorator', label: 'Decorator', icon: '🎨' },
  { value: 'planner_coordinator', label: 'Planner / Coordinator', icon: '📋' },
  { value: 'furniture', label: 'Furniture', icon: '🪑' },
  { value: 'photographer', label: 'Photographer', icon: '📷' },
  { value: 'musicians', label: 'Musicians', icon: '🎵' },
  { value: 'mc_host', label: 'MC / Host', icon: '🎤' },
  { value: 'other', label: 'Other', icon: '⭐' },
]

interface Vendor {
  id: string
  business_name: string
  category: string
  city: string
  state: string
  zip_code: string
  profile_image_url: string
  hourly_rate: number
  flat_rate: number
  rate_description: string
  is_verified: boolean
  bio: string
  phone: string
  email: string
  website: string
  instagram: string
  avgRating?: number
  reviewCount?: number
  distance_miles?: number
}

interface Venue {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  capacity?: number
  description?: string
  profile_image_url?: string
  website?: string
  phone?: string
  email?: string
}

interface VendorBooking {
  id: string
  vendor_account_id: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'paid'
  agreed_amount: number
  deposit_amount: number
  notes: string
  venue_name?: string
  venue_address?: string
  client_name?: string
  client_email?: string
  client_phone?: string
  created_at: string
  vendor_accounts?: {
    business_name: string
    category: string
    profile_image_url: string
    phone?: string
    email?: string
  }
}

const CATEGORY_ICON: Record<string, string> = {
  dj: '🎧',
  decorator: '🎨',
  planner_coordinator: '📋',
  furniture: '🪑',
  photographer: '📷',
  musicians: '🎵',
  mc_host: '🎤',
  other: '⭐',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  confirmed: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600', icon: <XCircle className="w-3.5 h-3.5" /> },
  completed: { label: 'Completed', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  paid: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
}

function StarRating({ rating, count }: { rating?: number; count?: number }) {
  if (!rating) return <span className="text-xs text-gray-400">No reviews</span>
  return (
    <span className="flex items-center gap-1">
      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
      <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-gray-400">({count})</span>}
    </span>
  )
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const icon = CATEGORY_ICON[vendor.category] || '⭐'
  const catLabel = CATEGORIES.find(c => c.value === vendor.category)?.label || vendor.category
  const initials = vendor.business_name
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <Link
      href={`/dashboard/vendors/${vendor.id}`}
      className="group bg-white rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col"
    >
      <div className="p-5 flex flex-col flex-1">
        {/* Top row: logo + badges */}
        <div className="flex items-start gap-4 mb-4">
          {/* Logo square */}
          <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
            {vendor.profile_image_url ? (
              <img src={vendor.profile_image_url} alt={vendor.business_name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl font-bold text-gray-400 select-none">{initials || icon}</span>
            )}
          </div>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1 mb-1">
              <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 leading-snug line-clamp-2 text-sm">
                {vendor.business_name}
              </h3>
              {vendor.is_verified && (
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {icon} {catLabel}
            </span>
          </div>
        </div>

        {/* Location */}
        {(vendor.city || vendor.state) && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {[vendor.city, vendor.state].filter(Boolean).join(', ')}
            {vendor.distance_miles != null && (
              <span className="ml-1 text-primary-500 font-medium">{vendor.distance_miles.toFixed(1)} mi</span>
            )}
          </p>
        )}

        {/* Footer: rating + price */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
          <StarRating rating={vendor.avgRating} count={vendor.reviewCount} />
          <div className="text-xs font-medium text-gray-500">
            {vendor.hourly_rate ? (
              <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3" />{vendor.hourly_rate}/hr</span>
            ) : vendor.flat_rate ? (
              <span className="flex items-center gap-0.5"><DollarSign className="w-3 h-3" />{vendor.flat_rate} flat</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  )
}

function VenueCard({ venue }: { venue: Venue }) {
  const initials = venue.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden flex flex-col">
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
            {venue.profile_image_url ? (
              <img src={venue.profile_image_url} alt={venue.name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl font-bold text-gray-400 select-none">{initials || '🏛️'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 leading-snug line-clamp-2 text-sm mb-1.5">{venue.name}</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
              🏛️ Venue
            </span>
          </div>
        </div>
        {(venue.city || venue.state) && (
          <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            {[venue.city, venue.state].filter(Boolean).join(', ')}
          </p>
        )}
        {venue.address && (
          <p className="text-xs text-gray-400 truncate mb-2">{venue.address}</p>
        )}
        {venue.capacity && (
          <p className="text-xs text-gray-400 mb-2">👥 Up to {venue.capacity.toLocaleString()} guests</p>
        )}
        <div className="mt-auto flex items-center gap-3 pt-3 border-t border-gray-100 flex-wrap">
          {venue.phone && (
            <a href={`tel:${venue.phone}`} className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              📞 {venue.phone}
            </a>
          )}
          {venue.website && (
            <a href={venue.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Website
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function BookingRow({ booking, onCancel, onConfirm }: { booking: VendorBooking; onCancel: (id: string) => void; onConfirm: (id: string) => void }) {
  const [open, setOpen] = useState(false)
  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending
  const vendor = booking.vendor_accounts
  const icon = vendor ? (CATEGORY_ICON[vendor.category] || '⭐') : '⭐'

  return (
    <>
      {/* Card — clickable */}
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all cursor-pointer"
      >
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {vendor?.profile_image_url ? (
            <img src={vendor.profile_image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg">{icon}</span>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900 truncate">{vendor?.business_name || 'Unknown Vendor'}</p>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
              {status.icon} {status.label}
            </span>
          </div>
          <p className="text-sm text-gray-600 truncate">{booking.event_name}</p>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(booking.event_date + 'T12:00:00').toLocaleDateString()}</span>
            {booking.start_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {booking.start_time}{booking.end_time ? ` – ${booking.end_time}` : ''}</span>}
          </div>
        </div>

        {/* Amount */}
        {booking.agreed_amount > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-gray-900">${booking.agreed_amount.toLocaleString()}</p>
            {booking.deposit_amount > 0 && (
              <p className="text-xs text-gray-400">${booking.deposit_amount} deposit</p>
            )}
          </div>
        )}

        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </div>

      {/* Detail modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {vendor?.profile_image_url ? (
                    <img src={vendor.profile_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">{icon}</span>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">{vendor?.business_name || 'Unknown Vendor'}</h2>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                    {status.icon} {status.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Event details */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Event Details</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-900 font-medium">{booking.event_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-700">{new Date(booking.event_date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  {(booking.start_time || booking.end_time) && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-700">{booking.start_time}{booking.end_time ? ` – ${booking.end_time}` : ''}</span>
                    </div>
                  )}
                  {booking.venue_name && (
                    <div className="flex items-start gap-2">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{booking.venue_name}{booking.venue_address ? `, ${booking.venue_address}` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              {(booking.agreed_amount > 0 || booking.deposit_amount > 0) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pricing</p>
                  <div className="flex gap-4">
                    {booking.agreed_amount > 0 && (
                      <div className="bg-gray-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-gray-500">Agreed Amount</p>
                        <p className="text-lg font-bold text-gray-900">${booking.agreed_amount.toLocaleString()}</p>
                      </div>
                    )}
                    {booking.deposit_amount > 0 && (
                      <div className="bg-gray-50 rounded-lg px-4 py-3">
                        <p className="text-xs text-gray-500">Deposit</p>
                        <p className="text-lg font-bold text-gray-900">${booking.deposit_amount.toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Client info */}
              {(booking.client_name || booking.client_email || booking.client_phone) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Client</p>
                  <div className="space-y-2 text-sm">
                    {booking.client_name && <p className="font-medium text-gray-900">{booking.client_name}</p>}
                    {booking.client_email && (
                      <a href={`mailto:${booking.client_email}`} className="flex items-center gap-2 text-primary-600 hover:underline">
                        <Mail className="w-4 h-4" /> {booking.client_email}
                      </a>
                    )}
                    {booking.client_phone && (
                      <a href={`tel:${booking.client_phone}`} className="flex items-center gap-2 text-primary-600 hover:underline">
                        <Phone className="w-4 h-4" /> {booking.client_phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Vendor contact */}
              {(vendor?.phone || vendor?.email) && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Vendor Contact</p>
                  <div className="space-y-2 text-sm">
                    {vendor.email && (
                      <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-primary-600 hover:underline">
                        <Mail className="w-4 h-4" /> {vendor.email}
                      </a>
                    )}
                    {vendor.phone && (
                      <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-primary-600 hover:underline">
                        <Phone className="w-4 h-4" /> {vendor.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {booking.notes && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-4 py-3 whitespace-pre-wrap">{booking.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-1 border-t border-gray-100">
                <Link
                  href={`/dashboard/vendors/${booking.vendor_account_id}`}
                  className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                  onClick={() => setOpen(false)}
                >
                  View Vendor Profile
                </Link>
                {(booking.status === 'confirmed' || booking.status === 'completed') && (
                  <>
                    <Link
                      href={`/dashboard/estimates/new?vendorBookingId=${booking.id}`}
                      className="text-xs px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg hover:bg-amber-100 font-medium"
                      onClick={() => setOpen(false)}
                    >
                      + Estimate
                    </Link>
                    <Link
                      href={`/dashboard/invoices/new?vendorBookingId=${booking.id}`}
                      className="text-xs px-3 py-1.5 bg-primary-50 border border-primary-200 text-primary-700 rounded-lg hover:bg-primary-100 font-medium"
                      onClick={() => setOpen(false)}
                    >
                      + Invoice
                    </Link>
                  </>
                )}
                {booking.status === 'pending' && (
                  <button
                    onClick={() => { onConfirm(booking.id); setOpen(false) }}
                    className="text-xs px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 font-medium"
                  >
                    Confirm Booking
                  </button>
                )}
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <button
                    onClick={() => { onCancel(booking.id); setOpen(false) }}
                    className="text-xs px-3 py-1.5 text-red-600 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 font-medium"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function DashboardVendorsPage() {
  const [activeTab, setActiveTab] = useState<'find' | 'bookings'>('find')

  // ── Find tab state ────────────────────────────────────────────
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [vendorPage, setVendorPage] = useState(1)
  const [venuePage, setVenuePage] = useState(1)
  const [searching, setSearching] = useState(false)
  const [searched, setSearched] = useState(false)
  const [zipCode, setZipCode] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('30')
  const [category, setCategory] = useState('')
  const [searchError, setSearchError] = useState('')

  // ── Bookings tab state ────────────────────────────────────────
  const [bookings, setBookings] = useState<VendorBooking[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [bookingFilter, setBookingFilter] = useState<string>('')

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true)
    try {
      const res = await api.get('/vendors/bookings/owner')
      setBookings(res.data || [])
    } catch {
      // silently fail — owner may have no bookings
    } finally {
      setBookingsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'bookings') loadBookings()
  }, [activeTab, loadBookings])

  const handleSearch = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    setSearching(true)
    setSearchError('')

    try {
      const params = new URLSearchParams()
      if (zipCode) params.set('zipCode', zipCode)
      if (radiusMiles) params.set('radiusMiles', radiusMiles)
      if (category) params.set('category', category)

      if (zipCode) {
        const res = await api.get(`/vendors/search?${params}`)
        setVendors(res.data.vendors || res.data || [])
        setVenues(res.data.venues || [])
      } else {
        const res = await api.get(`/vendors/public?${params}`)
        setVendors(res.data.vendors || res.data || [])
        setVenues(res.data.venues || [])
      }
      setSearched(true)
    } catch {
      setSearchError('Search failed. Please try again.')
    } finally {
      setSearching(false)
    }
  }, [zipCode, radiusMiles, category])

  // Load all vendors on mount
  useEffect(() => {
    handleSearch()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirmBooking = async (bookingId: string) => {
    if (!confirm('You confirm that Vendor Has Agreed to Booking')) return
    try {
      await api.put(`/vendors/bookings/${bookingId}`, { status: 'confirmed' })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'confirmed' } : b))
    } catch {
      alert('Failed to confirm booking. Please try again.')
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Cancel this vendor booking?')) return
    try {
      await api.put(`/vendors/bookings/${bookingId}`, { status: 'cancelled' })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b))
    } catch {
      alert('Failed to cancel booking. Please try again.')
    }
  }

  const filteredBookings = bookingFilter
    ? bookings.filter(b => b.status === bookingFilter)
    : bookings

  const bookingCounts = bookings.reduce((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Store className="w-6 h-6 text-primary-600" /> Vendors
        </h1>
        <p className="text-gray-500 text-sm mt-0.5 mb-3">Find and book event vendors for your venue</p>
        <div className="flex justify-center">
          <Link
            href="/dashboard/vendors/payments"
            className="flex items-center gap-2 bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100"
          >
            <CreditCard className="w-4 h-4" /> Vendor Payments
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
        {[
          { id: 'find', label: 'Find Vendors' },
          { id: 'bookings', label: `My Bookings${bookings.length > 0 ? ` (${bookings.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'find' | 'bookings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-primary-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── FIND TAB ──────────────────────────────────────────── */}
      {activeTab === 'find' && (
        <>
          {/* Search Form */}
          <form onSubmit={handleSearch} className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-medium text-gray-600 mb-1">Zip Code</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  placeholder="Enter zip code…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="w-32">
              <label className="block text-xs font-medium text-gray-600 mb-1">Radius</label>
              <select
                value={radiusMiles}
                onChange={e => setRadiusMiles(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {['10', '25', '30', '50', '75', '100'].map(r => (
                  <option key={r} value={r}>{r} miles</option>
                ))}
              </select>
            </div>

            <div className="w-52">
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={searching}
              className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {searchError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">{searchError}</div>
          )}

          {/* Results */}
          {searching ? (
            <div className="text-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" />
              Searching vendors…
            </div>
          ) : vendors.length === 0 && venues.length === 0 && searched ? (
            <div className="text-center py-16 text-gray-400">
              <Store className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No vendors found</p>
              <p className="text-sm mt-1">Try a different zip code, larger radius, or different category</p>
            </div>
          ) : (vendors.length > 0 || venues.length > 0) ? (
            <>
              {vendors.length > 0 && (
                <>
                  <p className="text-sm text-gray-500 mb-3">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''} found</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
                    {vendors.slice((vendorPage - 1) * 12, vendorPage * 12).map(v => <VendorCard key={v.id} vendor={v} />)}
                  </div>
                  <Pagination currentPage={vendorPage} totalItems={vendors.length} itemsPerPage={12} onPageChange={setVendorPage} />
                </>
              )}
              {venues.length > 0 && (
                <>
                  <h2 className="text-base font-semibold text-gray-700 mb-3 mt-2">🏛️ Venues ({venues.length})</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {venues.slice((venuePage - 1) * 12, venuePage * 12).map(v => <VenueCard key={v.id} venue={v} />)}
                  </div>
                  <Pagination currentPage={venuePage} totalItems={venues.length} itemsPerPage={12} onPageChange={setVenuePage} />
                </>
              )}
            </>
          ) : null}
        </>
      )}

      {/* ── BOOKINGS TAB ─────────────────────────────────────── */}
      {activeTab === 'bookings' && (
        <>
          {/* Status filter pills */}
          <div className="flex gap-2 flex-wrap mb-4">
            {[
              { value: '', label: `All (${bookings.length})` },
              { value: 'pending', label: `Pending (${bookingCounts.pending || 0})` },
              { value: 'confirmed', label: `Confirmed (${bookingCounts.confirmed || 0})` },
              { value: 'paid', label: `Paid (${bookingCounts.paid || 0})` },
              { value: 'completed', label: `Completed (${bookingCounts.completed || 0})` },
              { value: 'cancelled', label: `Cancelled (${bookingCounts.cancelled || 0})` },
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setBookingFilter(f.value)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  bookingFilter === f.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-300'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {bookingsLoading ? (
            <div className="text-center py-16 text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3" />
              Loading bookings…
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200 text-gray-400">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No vendor bookings yet</p>
              <p className="text-sm mt-1">Browse vendors and book them for your events</p>
              <button
                onClick={() => setActiveTab('find')}
                className="mt-4 text-sm text-primary-600 hover:underline"
              >
                Find Vendors →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map(b => (
                <BookingRow key={b.id} booking={b} onCancel={handleCancelBooking} onConfirm={handleConfirmBooking} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
