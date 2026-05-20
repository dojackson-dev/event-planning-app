'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Loader2, Save, Mic2, Calendar, X } from 'lucide-react'

interface PromoterEvent {
  id: string
  title: string
  event_date: string | null
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  venue_address: string | null
  city: string | null
  state: string | null
  status: string
}

function NewPromoterBookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const artistId = searchParams.get('artistId') || ''
  const artistNameParam = searchParams.get('artistName') || ''
  const artistEmailParam = searchParams.get('artistEmail') || ''
  const artistPhoneParam = searchParams.get('artistPhone') || ''
  const feeMin = searchParams.get('feeMin') || ''

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Event picker state
  const [events, setEvents] = useState<PromoterEvent[]>([])
  const [showEventPicker, setShowEventPicker] = useState(false)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [linkedEventId, setLinkedEventId] = useState('')
  const [linkedEventName, setLinkedEventName] = useState('')

  const [form, setForm] = useState({
    event_name: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    event_date: '',
    event_start_time: '',
    event_end_time: '',
    venue_name: '',
    venue_address: '',
    agreed_amount: '',
    deposit_amount: '',
    notes: '',
    status: 'inquiry',
  })

  useEffect(() => {
    const name = searchParams.get('artistName') || ''
    const email = searchParams.get('artistEmail') || ''
    const phone = searchParams.get('artistPhone') || ''
    const fee = searchParams.get('feeMin') || ''
    setForm(f => ({
      ...f,
      ...(name && { client_name: name }),
      ...(email && { client_email: email }),
      ...(phone && { client_phone: phone }),
      ...(fee && { agreed_amount: fee }),
    }))
  }, [searchParams])

  const openEventPicker = async () => {
    setShowEventPicker(true)
    if (events.length > 0) return
    setEventsLoading(true)
    try {
      const res = await api.get('/promoter-events/mine')
      const upcoming = (res.data as PromoterEvent[]).filter(e => e.status !== 'cancelled')
      setEvents(upcoming)
    } catch {
      // silently fail — user can still fill manually
    } finally {
      setEventsLoading(false)
    }
  }

  const applyEvent = (ev: PromoterEvent) => {
    setLinkedEventId(ev.id)
    setLinkedEventName(ev.title)
    setForm(f => ({
      ...f,
      event_name: ev.title,
      event_date: ev.event_date ?? f.event_date,
      event_start_time: ev.start_time ?? f.event_start_time,
      event_end_time: ev.end_time ?? f.event_end_time,
      venue_name: ev.venue_name ?? f.venue_name,
      venue_address: ev.venue_address ?? f.venue_address,
    }))
    setShowEventPicker(false)
  }

  const clearLinkedEvent = () => {
    setLinkedEventId('')
    setLinkedEventName('')
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const payload: Record<string, any> = { ...form }
      if (payload.agreed_amount) payload.agreed_amount = parseFloat(payload.agreed_amount)
      if (payload.deposit_amount) payload.deposit_amount = parseFloat(payload.deposit_amount)
      ;['client_phone', 'event_start_time', 'event_end_time', 'venue_address', 'notes'].forEach(k => {
        if (!payload[k]) delete payload[k]
      })
      if (!payload.event_date) delete payload.event_date
      if (!payload.agreed_amount) delete payload.agreed_amount
      if (!payload.deposit_amount) delete payload.deposit_amount

      if (artistId) {
        payload.artist_account_id = artistId
        payload.artist_name = artistNameParam
      }

      await api.post('/promoter-bookings', payload)
      router.push('/dashboard/promoter/bookings')
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to create booking')
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Artist Banner */}
          {artistId && artistNameParam && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
              <Mic2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-purple-900">Booking Artist: {artistNameParam}</p>
                <p className="text-xs text-purple-600 mt-0.5">
                  Fill in the event details below to submit your booking request.
                </p>
              </div>
              <Link href={`/dashboard/promoter/artists/${artistId}`} className="ml-auto text-xs text-purple-600 hover:underline whitespace-nowrap">
                View Profile
              </Link>
            </div>
          )}
          {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Event Details</h2>
              <button type="button" onClick={openEventPicker}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
                <Calendar className="w-3.5 h-3.5" />
                Pull from Event
              </button>
            </div>
            {linkedEventId && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm">
                <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
                <span className="text-purple-800 font-medium flex-1">Linked: {linkedEventName}</span>
                <button type="button" onClick={clearLinkedEvent} className="text-purple-400 hover:text-purple-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
              <input value={form.event_name} onChange={e => set('event_name', e.target.value)} required
                placeholder="Concert, Festival, Club Night..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="inquiry">Inquiry</option>
                  <option value="estimate_sent">Estimate Sent</option>
                  <option value="deposit_paid">Deposit Paid</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" value={form.event_start_time} onChange={e => set('event_start_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" value={form.event_end_time} onChange={e => set('event_end_time', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
              <input value={form.venue_name} onChange={e => set('venue_name', e.target.value)}
                placeholder="Venue or location name"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue Address</label>
              <input value={form.venue_address} onChange={e => set('venue_address', e.target.value)}
                placeholder="Full address"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Client Information</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input value={form.client_name} onChange={e => set('client_name', e.target.value)} required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={form.client_phone} onChange={e => set('client_phone', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Client Email *</label>
              <input type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h2 className="font-semibold text-gray-800">Financials</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Amount ($)</label>
                <input type="number" min="0" step="0.01" value={form.agreed_amount} onChange={e => set('agreed_amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount ($)</label>
                <input type="number" min="0" step="0.01" value={form.deposit_amount} onChange={e => set('deposit_amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
              placeholder="Anything relevant to this booking..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Booking
          </button>
        </form>
      </div>

      {/* Event Picker Modal */}
      {showEventPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-gray-900">Select an Event</h3>
              <button type="button" onClick={() => setShowEventPicker(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No events found.{' '}
                  <Link href="/dashboard/promoter/events/new" className="text-purple-600 hover:underline">Create one first</Link>
                </div>
              ) : (
                events.map(ev => (
                  <button key={ev.id} type="button" onClick={() => applyEvent(ev)}
                    className="w-full text-left p-3 border border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-colors">
                    <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      {ev.event_date && <span>📅 {new Date(ev.event_date + 'T00:00:00').toLocaleDateString()}</span>}
                      {ev.venue_name && <span>📍 {ev.venue_name}</span>}
                      {ev.city && <span>{ev.city}{ev.state ? `, ${ev.state}` : ''}</span>}
                    </div>
                    <span className={`mt-1.5 inline-block text-xs px-2 py-0.5 rounded-full font-medium
                      ${ev.status === 'published' ? 'bg-green-100 text-green-700' :
                        ev.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        'bg-yellow-100 text-yellow-700'}`}>
                      {ev.status}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NewPromoterBookingPage() {
  return (
    <Suspense>
      <NewPromoterBookingContent />
    </Suspense>
  )
}
