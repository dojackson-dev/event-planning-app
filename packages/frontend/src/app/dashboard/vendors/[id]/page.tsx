'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  ArrowLeft,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Instagram,
  CheckCircle,
  DollarSign,
  Calendar,
  Clock,
  X,
  Send,
  Building2,
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  dj: '🎧 DJ',
  decorator: '🎨 Decorator',
  planner_coordinator: '📋 Planner/Coordinator',
  furniture: '🪑 Furniture',
  photographer: '📷 Photographer',
  musicians: '🎸 Musicians',
  mc_host: '🎤 MC/Host',
  other: '⭐ Other',
}

interface VendorProfile {
  id: string
  user_id: string
  business_name: string
  category: string
  bio: string
  city: string
  state: string
  zip_code: string
  address: string
  profile_image_url: string
  gallery_images?: string[]
  is_verified: boolean
  hourly_rate: number
  flat_rate: number
  rate_description: string
  phone: string
  email: string
  website: string
  instagram: string
  avgRating?: number
  reviewCount?: number
}

interface Review {
  id: string
  rating: number
  review_text: string
  reviewer_name: string
  created_at: string
}

interface OwnerEvent {
  id: string
  name: string
  date: string
  startTime?: string
  endTime?: string
  venue?: string
  location?: string
}

interface BookingForm {
  eventId: string
  eventName: string
  eventDate: string
  startTime: string
  endTime: string
  venueName: string
  venueAddress: string
  notes: string
  agreedAmount: string
  depositAmount: string
  clientName: string
  clientEmail: string
  clientPhone: string
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star
          key={s}
          className={`w-4 h-4 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
        />
      ))}
    </div>
  )
}

export default function OwnerVendorProfile({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [vendor, setVendor] = useState<VendorProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [events, setEvents] = useState<OwnerEvent[]>([])
  const [eventClientMap, setEventClientMap] = useState<Record<string, ClientInfo>>({})
  const [loading, setLoading] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingSubmitting, setBookingSubmitting] = useState(false)
  const [bookingError, setBookingError] = useState('')

  interface ClientInfo { name: string; email?: string; phone?: string }

  const [form, setForm] = useState<BookingForm>({
    eventId: '',
    eventName: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    venueName: '',
    venueAddress: '',
    notes: '',
    agreedAmount: '',
    depositAmount: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [vendorRes, reviewsRes, eventsRes, bookingsRes, intakeRes] = await Promise.all([
          api.get(`/vendors/${params.id}`),
          api.get(`/vendors/${params.id}/reviews`),
          api.get('/events').catch(() => ({ data: [] })),
          api.get('/bookings').catch(() => ({ data: [] })),
          api.get('/intake-forms').catch(() => ({ data: [] })),
        ])
        setVendor(vendorRes.data)
        setReviews(reviewsRes.data)

        // Real events from the event table
        const today = new Date().toISOString().split('T')[0]
        const realEvents: OwnerEvent[] = (eventsRes.data || []).filter((ev: any) =>
          ev.status !== 'cancelled' && ev.date >= today
        )

        // Intake forms that haven't been converted yet (same as calendar)
        const intakeForms: OwnerEvent[] = (intakeRes.data || [])
          .filter((f: any) => f.event_date && f.event_date.split('T')[0] >= today && (f.status === 'new' || f.status === 'contacted'))
          .map((f: any) => ({
            id: `intake-${f.id}`,
            name: `${f.event_type ? f.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Event'} — ${f.contact_name}`,
            date: f.event_date.split('T')[0],
            startTime: f.event_time || undefined,
            venue: f.venue_preference || undefined,
          }))

        // Merge: real events first, then intake-form entries
        setEvents([...realEvents, ...intakeForms])

        // Build event_id → client info map from bookings
        const map: Record<string, ClientInfo> = {}
        for (const b of (bookingsRes.data || [])) {
          if (b.event_id && b.contact_name) {
            map[b.event_id] = { name: b.contact_name, email: b.contact_email || undefined, phone: b.contact_phone || undefined }
          }
        }
        // Also add intake-form contact info
        for (const f of (intakeRes.data || [])) {
          if (f.contact_name) {
            map[`intake-${f.id}`] = { name: f.contact_name, email: f.contact_email || undefined, phone: f.contact_phone || undefined }
          }
        }
        setEventClientMap(map)
      } catch {
        router.push('/dashboard/vendors')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  // When an owner event is selected, pre-fill all event details
  const handleEventSelect = (eventId: string) => {
    const ev = events.find(e => e.id === eventId)
    const client = eventClientMap[eventId]
    if (ev) {
      // Strip the 'intake-' prefix for display — we don't send it to the API
      const isIntake = eventId.startsWith('intake-')
      setForm(prev => ({
        ...prev,
        eventId,
        eventName: ev.name || prev.eventName,
        eventDate: ev.date ? ev.date.split('T')[0] : prev.eventDate,
        startTime: ev.startTime || '',
        endTime: ev.endTime || '',
        venueName: ev.venue || '',
        venueAddress: ev.location || '',
        clientName: client?.name || prev.clientName,
        clientEmail: client?.email || prev.clientEmail,
        clientPhone: client?.phone || prev.clientPhone,
      }))
      // For intake form entries the name already contains the client name; keep it clean
      if (isIntake && client?.name) {
        // name is already "Event Type — Client Name", no extra change needed
      }
    } else {
      setForm(prev => ({ ...prev, eventId: '' }))
    }
  }

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.eventName.trim()) { setBookingError('Event name is required'); return }
    if (!form.eventDate) { setBookingError('Event date is required'); return }
    setBookingSubmitting(true)
    setBookingError('')
    try {
      await api.post('/vendors/bookings', {
        vendorAccountId: params.id,
        eventName: form.eventName,
        eventDate: form.eventDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        venueName: form.venueName || undefined,
        venueAddress: form.venueAddress || undefined,
        notes: form.notes || undefined,
        agreedAmount: form.agreedAmount ? parseFloat(form.agreedAmount) : undefined,
        depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : undefined,
        clientName: form.clientName || undefined,
        clientEmail: form.clientEmail || undefined,
        clientPhone: form.clientPhone || undefined,
      })
      setBookingSuccess(true)
      setBookingOpen(false)
      setForm({
        eventId: '', eventName: '', eventDate: '', startTime: '', endTime: '',
        venueName: '', venueAddress: '', notes: '', agreedAmount: '', depositAmount: '',
        clientName: '', clientEmail: '', clientPhone: '',
      })
    } catch (err: any) {
      console.error('Booking 400 error — full response:', err.response?.data)
      setBookingError(err.response?.data?.message || err.message || 'Failed to send booking request')
    } finally {
      setBookingSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!vendor) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back */}
      <Link
        href="/dashboard/vendors"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-600 mb-5 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Vendors
      </Link>

      {/* Success Banner */}
      {bookingSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 flex items-center gap-2 mb-5 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Booking request sent! {vendor.business_name} will confirm shortly. You can track it under{' '}
          <Link href="/dashboard/vendors?tab=bookings" className="font-semibold underline">My Bookings</Link>.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">
          {/* Hero card */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 rounded-full border-4 border-white bg-white shadow overflow-hidden flex-shrink-0">
                  {vendor.profile_image_url ? (
                    <img src={vendor.profile_image_url} alt={vendor.business_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary-100 flex items-center justify-center text-3xl">
                      {CATEGORY_LABELS[vendor.category]?.split(' ')[0] || '🎪'}
                    </div>
                  )}
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-bold text-gray-900">{vendor.business_name}</h1>
                    {vendor.is_verified && (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {CATEGORY_LABELS[vendor.category] || vendor.category}
                    {(vendor.city || vendor.state) && ` · ${[vendor.city, vendor.state].filter(Boolean).join(', ')}`}
                  </p>
                  {vendor.avgRating && (
                    <div className="flex items-center gap-2 mt-1">
                      <StarDisplay rating={vendor.avgRating} />
                      <span className="text-sm text-gray-600 font-medium">{vendor.avgRating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({vendor.reviewCount} reviews)</span>
                    </div>
                  )}
                </div>
              </div>

              {vendor.bio && (
                <p className="text-gray-600 text-sm leading-relaxed">{vendor.bio}</p>
              )}
            </div>
          </div>

          {/* Pricing */}
          {(vendor.hourly_rate || vendor.flat_rate || vendor.rate_description) && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary-600" /> Pricing
              </h2>
              <div className="flex flex-wrap gap-4">
                {vendor.hourly_rate > 0 && (
                  <div className="bg-primary-50 rounded-lg px-4 py-3 text-center">
                    <p className="text-xl font-bold text-primary-700">${vendor.hourly_rate}</p>
                    <p className="text-xs text-primary-600 mt-0.5">per hour</p>
                  </div>
                )}
                {vendor.flat_rate > 0 && (
                  <div className="bg-purple-50 rounded-lg px-4 py-3 text-center">
                    <p className="text-xl font-bold text-purple-700">${vendor.flat_rate}</p>
                    <p className="text-xs text-purple-600 mt-0.5">flat rate</p>
                  </div>
                )}
                {vendor.rate_description && (
                  <p className="text-sm text-gray-500 self-center">{vendor.rate_description}</p>
                )}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" />
              Reviews {reviews.length > 0 && <span className="text-gray-400 font-normal">({reviews.length})</span>}
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-400">No reviews yet</p>
            ) : (
              <div className="space-y-4">
                {reviews.map(r => (
                  <div key={r.id} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <StarDisplay rating={r.rating} />
                        <span className="text-sm font-medium text-gray-700">{r.reviewer_name || 'Anonymous'}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {r.review_text && <p className="text-sm text-gray-600 mt-1">{r.review_text}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN (sticky) ────────────────────────── */}
        <div className="space-y-4">
          {/* Book CTA */}
          <div className="bg-white rounded-xl shadow-sm p-5 border border-primary-100">
            <h3 className="font-semibold text-gray-900 mb-1">Ready to book?</h3>
            <p className="text-xs text-gray-500 mb-4">
              Send a booking request. {vendor.business_name} will confirm availability.
            </p>
            <button
              onClick={() => setBookingOpen(true)}
              className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-semibold hover:bg-primary-700 flex items-center justify-center gap-2"
            >
              <Calendar className="w-4 h-4" /> Book {vendor.business_name}
            </button>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Contact</h3>
            {vendor.phone && (
              <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600">
                <Phone className="w-4 h-4 flex-shrink-0 text-gray-400" /> {vendor.phone}
              </a>
            )}
            {vendor.email && (
              <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 break-all">
                <Mail className="w-4 h-4 flex-shrink-0 text-gray-400" /> {vendor.email}
              </a>
            )}
            {vendor.website && (
              <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600 break-all">
                <Globe className="w-4 h-4 flex-shrink-0 text-gray-400" /> Website
              </a>
            )}
            {vendor.instagram && (
              <a
                href={`https://instagram.com/${vendor.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
              >
                <Instagram className="w-4 h-4 flex-shrink-0 text-gray-400" /> @{vendor.instagram.replace('@', '')}
              </a>
            )}
            {(vendor.city || vendor.state) && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4 flex-shrink-0 text-gray-400" />
                {[vendor.address, vendor.city, vendor.state, vendor.zip_code].filter(Boolean).join(', ')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── BOOKING MODAL ─────────────────────────────────────── */}
      {bookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl">
              <div>
                <h2 className="font-bold text-gray-900">Book {vendor.business_name}</h2>
                <p className="text-xs text-gray-400 mt-0.5">Fill out the details and send your request</p>
              </div>
              <button
                onClick={() => { setBookingOpen(false); setBookingError('') }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="px-6 py-5 space-y-4">
              {bookingError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                  {bookingError}
                </div>
              )}

              {/* Client Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Client Information</p>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Client Name</label>
                    <input
                      type="text"
                      value={form.clientName}
                      onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))}
                      placeholder="Client full name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Client Email</label>
                    <input
                      type="email"
                      value={form.clientEmail}
                      onChange={e => setForm(p => ({ ...p, clientEmail: e.target.value }))}
                      placeholder="client@email.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Client Phone</label>
                    <input
                      type="tel"
                      value={form.clientPhone}
                      onChange={e => setForm(p => ({ ...p, clientPhone: e.target.value }))}
                      placeholder="(555) 000-0000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Event name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                {events.length > 0 ? (
                  <>
                    <select
                      required={form.eventId !== 'other'}
                      value={form.eventId || ''}
                      onChange={e => {
                        const val = e.target.value
                        if (val === 'other') {
                          setForm(p => ({ ...p, eventId: 'other', eventName: '' }))
                        } else {
                          handleEventSelect(val)
                        }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">— Select an event —</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>
                          {ev.name}
                          {eventClientMap[ev.id] ? ` — ${eventClientMap[ev.id].name}` : ''}
                          {ev.date ? ` (${new Date(ev.date + 'T12:00:00').toLocaleDateString()})` : ' (No date)'}
                        </option>
                      ))}
                      <option value="other">Other (enter custom name)…</option>
                    </select>
                    {form.eventId === 'other' && (
                      <input
                        type="text"
                        required
                        value={form.eventName}
                        onChange={e => setForm(p => ({ ...p, eventName: e.target.value }))}
                        placeholder="e.g. Smith Wedding Reception"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 mt-2"
                      />
                    )}
                  </>
                ) : (
                  <input
                    type="text"
                    required
                    value={form.eventName}
                    onChange={e => setForm(p => ({ ...p, eventName: e.target.value }))}
                    placeholder="e.g. Smith Wedding Reception"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>

              {/* Date + times */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date *</label>
                  <input
                    type="date"
                    required
                    value={form.eventDate}
                    onChange={e => setForm(p => ({ ...p, eventDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Venue */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 className="inline w-3.5 h-3.5 mr-1 text-gray-400" />Venue Name
                  </label>
                  <input
                    type="text"
                    value={form.venueName}
                    onChange={e => setForm(p => ({ ...p, venueName: e.target.value }))}
                    placeholder="e.g. Grand Ballroom"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="inline w-3.5 h-3.5 mr-1 text-gray-400" />Venue Address
                  </label>
                  <input
                    type="text"
                    value={form.venueAddress}
                    onChange={e => setForm(p => ({ ...p, venueAddress: e.target.value }))}
                    placeholder="123 Main St, City, TX"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <DollarSign className="inline w-3.5 h-3.5 mr-1 text-gray-400" />Agreed Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.agreedAmount}
                    onChange={e => setForm(p => ({ ...p, agreedAmount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <DollarSign className="inline w-3.5 h-3.5 mr-1 text-gray-400" />Deposit Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.depositAmount}
                    onChange={e => setForm(p => ({ ...p, depositAmount: e.target.value }))}
                    placeholder="0.00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Special Requests</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Any specific requirements, style preferences, or questions…"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setBookingOpen(false); setBookingError('') }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="flex-1 bg-primary-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {bookingSubmitting ? 'Sending…' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
