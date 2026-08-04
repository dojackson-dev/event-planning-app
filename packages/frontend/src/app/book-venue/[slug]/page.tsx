'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Calendar, User, Mail, Phone, MapPin, Clock, CheckCircle2, AlertCircle, Loader2, Building2, Send, ArrowRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface BookingLinkInfo {
  id: string
  slug: string
  is_active: boolean
  custom_message: string | null
  owner_accounts: {
    business_name: string
    logo_url: string | null
  }
}

export default function PublicVenueBookingPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string

  const [linkInfo, setLinkInfo] = useState<BookingLinkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [smsOptIn, setSmsOptIn] = useState(true)
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
        const res = await fetch(`${API_URL}/owner/booking-link/${slug}`)
        if (!res.ok) throw new Error('Not found')
        setLinkInfo(await res.json())
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
    if (!clientName.trim() || !clientEmail.trim()) { setError('Your name and email are required.'); return }
    if (smsOptIn && !clientPhone.trim()) { setError('Please enter a phone number to receive text updates, or uncheck the text opt-in.'); return }
    setSubmitting(true)
    try {
      const res = await fetch(`${API_URL}/owner/booking-link/${slug}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName, clientEmail, clientPhone: clientPhone || undefined, smsOptIn,
          eventName: eventName || undefined, eventDate: eventDate || undefined,
          startTime: startTime || undefined, endTime: endTime || undefined,
          venueName: venueName || undefined, venueAddress: venueAddress || undefined,
          notes: notes || undefined,
        }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Failed to submit') }
      setSubmitted(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally { setSubmitting(false) }
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>

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
  const owner = linkInfo.owner_accounts

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-green-500" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Request Sent!</h1>
          <p className="text-gray-500 text-sm mb-6">Your booking inquiry has been sent to <strong>{owner.business_name}</strong>.</p>
          <button onClick={() => router.push('/')} className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700">
            <ArrowRight className="w-4 h-4" /> Back to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6 text-center">
          {owner.logo_url ? (
            <img src={owner.logo_url} alt={owner.business_name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-orange-100 shadow" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-orange-500" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{owner.business_name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Venue</p>
        </div>

        {linkInfo.custom_message && (
          <div className="bg-orange-50 border border-orange-100 text-orange-800 rounded-xl p-4 mb-5 text-sm">{linkInfo.custom_message}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">Request a Booking</h2>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} required placeholder="Full name"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} required placeholder="your@email.com"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="(555) 000-0000"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={smsOptIn} onChange={e => setSmsOptIn(e.target.checked)} className="w-4 h-4 rounded accent-orange-600" />
                <span className="text-xs text-gray-500">Send me text updates about this booking</span>
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Event Type / Name</label>
                <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="e.g. Wedding, Birthday Party, Corporate Event"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Event Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Preferred Space / Room</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={venueName} onChange={e => setVenueName(e.target.value)} placeholder="e.g. Main Hall, Rooftop"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Additional Notes</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Estimated guest count, catering needs, AV requirements..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
            </div>
            <button type="submit" disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white font-semibold py-3 rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-60 text-base">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Sending…</> : <><Send className="w-5 h-5" /> Send Booking Request</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
