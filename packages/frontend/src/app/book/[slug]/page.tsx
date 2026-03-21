'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, User, Mail, Phone, MapPin, Clock, CheckCircle2, AlertCircle, Loader2, Building2, Send } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface BookingLinkInfo {
  id: string
  slug: string
  is_active: boolean
  custom_message: string | null
  default_deposit_percentage: number | null
  vendor_accounts: {
    business_name: string
    category: string
    city: string | null
    state: string | null
    bio: string | null
    profile_image_url: string | null
    hourly_rate: number | null
    flat_rate: number | null
    rate_description: string | null
  }
}

const CATEGORY_LABELS: Record<string, string> = {
  dj: '🎧 DJ',
  decorator: '🎨 Decorator',
  planner_coordinator: '📋 Planner / Coordinator',
  furniture: '🪑 Furniture',
  photographer: '📷 Photographer',
  musicians: '🎵 Musicians',
  mc_host: '🎤 MC / Host',
  other: '⭐ Other',
}

export default function PublicBookingPage() {
  const params = useParams()
  const slug = params.slug as string

  const [linkInfo, setLinkInfo] = useState<BookingLinkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  // Form fields
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const res = await fetch(`${API_URL}/vendors/booking-link/${slug}`)
        if (!res.ok) throw new Error('Not found')
        const data = await res.json()
        setLinkInfo(data)
      } catch {
        setError('This booking link is not available.')
      } finally {
        setLoading(false)
      }
    }
    fetchLink()
  }, [slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!clientName.trim() || !clientEmail.trim()) {
      setError('Your name and email are required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/vendors/booking-link/${slug}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientEmail,
          clientPhone: clientPhone || undefined,
          eventName: eventName || undefined,
          eventDate: eventDate || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          venueName: venueName || undefined,
          venueAddress: venueAddress || undefined,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Submission failed')
      }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    )
  }

  if (error && !linkInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Not Available</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!linkInfo) return null

  const vendor = linkInfo.vendor_accounts

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-green-500" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h1>
          <p className="text-gray-500 text-sm mb-1">
            Your booking request has been sent to <strong>{vendor.business_name}</strong>.
          </p>
          <p className="text-gray-400 text-sm">They will review your request and get back to you at <strong>{clientEmail}</strong>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        {/* Vendor card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6 text-center">
          {vendor.profile_image_url ? (
            <img
              src={vendor.profile_image_url}
              alt={vendor.business_name}
              className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-indigo-100 shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-indigo-500" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{vendor.business_name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{CATEGORY_LABELS[vendor.category] || vendor.category}</p>
          {(vendor.city || vendor.state) && (
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {[vendor.city, vendor.state].filter(Boolean).join(', ')}
            </p>
          )}
          {vendor.bio && (
            <p className="text-sm text-gray-600 mt-3 leading-relaxed max-w-sm mx-auto">{vendor.bio}</p>
          )}
          {(vendor.hourly_rate || vendor.flat_rate) && (
            <div className="mt-3 flex justify-center gap-4 text-sm">
              {vendor.hourly_rate && (
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium">
                  ${vendor.hourly_rate}/hr
                </span>
              )}
              {vendor.flat_rate && (
                <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-medium">
                  ${vendor.flat_rate} flat
                </span>
              )}
            </div>
          )}
        </div>

        {/* Custom message */}
        {linkInfo.custom_message && (
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-xl p-4 mb-5 text-sm">
            {linkInfo.custom_message}
          </div>
        )}

        {/* Booking form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Request a Booking</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Your info */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Your Information</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Jane Doe"
                      required
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={e => setClientEmail(e.target.value)}
                      placeholder="jane@example.com"
                      required
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone (optional)</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Event details */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Event Details</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Event Name</label>
                  <input
                    type="text"
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    placeholder="Wedding, Birthday Party, Corporate Event…"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Event Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={eventDate}
                      onChange={e => setEventDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={startTime}
                      onChange={e => setStartTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Time</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="time"
                      value={endTime}
                      onChange={e => setEndTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Venue Name</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={venueName}
                      onChange={e => setVenueName(e.target.value)}
                      placeholder="Venue name"
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Venue Address</label>
                  <input
                    type="text"
                    value={venueAddress}
                    onChange={e => setVenueAddress(e.target.value)}
                    placeholder="123 Main St, City, State"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special requests, details, or questions…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {linkInfo.default_deposit_percentage && (
              <p className="text-xs text-gray-400">
                A deposit of {linkInfo.default_deposit_percentage}% may be required to confirm your booking.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-60 text-base"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Sending Request…</>
              ) : (
                <><Send className="w-5 h-5" /> Send Booking Request</>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Powered by <span className="font-semibold text-gray-500">DoVenue Suite</span>
        </p>
      </div>
    </div>
  )
}
