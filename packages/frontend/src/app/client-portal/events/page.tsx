'use client'

import { useState, useEffect } from 'react'
import clientApi from '@/lib/clientApi'
import { Calendar, MapPin, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react'

const EVENT_TYPE_LABELS: Record<string, string> = {
  wedding_reception:    '💍 Wedding Reception',
  birthday_party:       '🎂 Birthday Party',
  retirement:           '🎉 Retirement',
  anniversary:          '💑 Anniversary',
  baby_shower:          '🍼 Baby Shower',
  corporate_event:      '🏢 Corporate Event',
  fundraiser_gala:      '🎗️ Fundraiser / Gala',
  concert_show:         '🎵 Concert / Show',
  conference_meeting:   '📋 Conference / Meeting',
  quinceanera:          '👑 Quinceañera',
  sweet_16:             '🎀 Sweet 16',
  prom_formal:          '🕺 Prom / Formal',
  family_reunion:       '👪 Family Reunion',
  holiday_party:        '🎄 Holiday Party',
  engagement_party:     '💍 Engagement Party',
  graduation_party:     '🎓 Graduation Party',
}

const statusColor: Record<string, string> = {
  scheduled:  'bg-blue-100 text-blue-700 border-blue-200',
  completed:  'bg-green-100 text-green-700 border-green-200',
  draft:      'bg-gray-100 text-gray-600 border-gray-200',
  confirmed:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelled:  'bg-red-100 text-red-700 border-red-200',
}

export default function ClientEventsPage() {
  const [events, setEvents] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      clientApi.get('/events'),
      clientApi.get('/bookings'),
    ]).then(([evRes, bkRes]) => {
      setEvents(evRes.data)
      setBookings(bkRes.data)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const bookingForEvent = (eventId: string) =>
    bookings.find((b: any) => b.event_id === eventId || b.event?.id === eventId)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading events...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-primary-600" />
          My Events
        </h1>
        <span className="text-sm text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}</span>
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No confirmed events yet.</p>
          <p className="text-gray-400 text-sm mt-1">
            Events will appear here once you confirm them via the invitation link sent to your email.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event: any) => {
            const booking = bookingForEvent(event.id)
            const isExpanded = expanded === event.id
            return (
              <div key={event.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Header row */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : event.id)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">{event.name}</h3>
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusColor[event.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {event.status}
                      </span>
                      {event.event_type && (
                        <span className="text-xs text-gray-500">{EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                      {event.date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                      {event.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                        </span>
                      )}
                      {event.venue && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          {event.venue}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" /> : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0 ml-4" />}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-6 py-4 bg-gray-50/50 space-y-4">
                    {event.description && (
                      <p className="text-sm text-gray-600">{event.description}</p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {event.max_guests && (
                        <InfoItem icon={<Users className="h-4 w-4" />} label="Max Guests" value={event.max_guests} />
                      )}
                      {event.location && (
                        <InfoItem icon={<MapPin className="h-4 w-4" />} label="Address" value={event.location} />
                      )}
                    </div>

                    {booking && (
                      <div className="mt-4 rounded-lg bg-white border border-gray-200 p-4">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Booking Details</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                          <InfoItem label="Booking Status" value={booking.status} />
                          <InfoItem label="Total Price" value={`$${Number(booking.total_price ?? 0).toFixed(2)}`} />
                          <InfoItem label="Deposit" value={`$${Number(booking.deposit ?? 0).toFixed(2)}`} />
                          <InfoItem label="Amount Paid" value={`$${Number(booking.total_amount_paid ?? 0).toFixed(2)}`} />
                          <InfoItem label="Payment Status" value={booking.payment_status ?? '—'} />
                          <InfoItem label="Client Status" value={booking.client_status ?? '—'} />
                        </div>
                        {booking.notes && (
                          <p className="mt-3 text-sm text-gray-600 italic">"{booking.notes}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function InfoItem({ icon, label, value }: { icon?: React.ReactNode; label: string; value: any }) {
  return (
    <div>
      <p className="text-xs text-gray-500 flex items-center gap-1">{icon}{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
    </div>
  )
}
