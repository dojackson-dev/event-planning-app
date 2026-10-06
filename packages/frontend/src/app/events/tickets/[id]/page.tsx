'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import api from '@/lib/api'
import { MapPin, Calendar, Clock, Tag, Ticket, Loader2, ImageIcon } from 'lucide-react'

// The seatmap manipulates the DOM/SVG directly and isn't SSR-safe — load it
// client-side only. The underlying class component declares its optional
// props via `defaultProps`, which next/dynamic's generic wrapper doesn't
// pick up, so we type it ourselves with just the props we actually pass.
interface SeatmapProps {
  venueId: string
  configurationId: string
  ticketGroups: { tevo_section_name: string; retail_price: number }[]
}
const TicketMap = dynamic<SeatmapProps>(
  () => import('@ticketevolution/seatmaps-client').then(m => m.TicketMap as any),
  { ssr: false },
)

interface Listing {
  id: number
  section: string | null
  row: string | null
  quantity: number
  retail_price: number
  format: string | null
}

interface TevoEventDetail {
  id: string
  title: string
  notes: string | null
  event_date: string | null
  start_time: string | null
  venue_name: string | null
  venue_id: number | null
  configuration_id: number | null
  city: string | null
  state: string | null
  category: string | null
  images: string[]
  listings: Listing[]
}

export default function TicketEvolutionEventDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const [event, setEvent] = useState<TevoEventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activePhoto, setActivePhoto] = useState(0)

  useEffect(() => {
    api.get<TevoEventDetail | null>(`/ticket-evolution/public-events/${id}`)
      .then(res => {
        if (!res.data) {
          setError('Event not found.')
        } else {
          setEvent(res.data)
        }
      })
      .catch(() => setError('Could not load this event.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600 text-lg text-center">{error || 'Event not found.'}</p>
        <Link href="/events" className="text-purple-600 hover:underline text-sm">← Browse events</Link>
      </div>
    )
  }

  const dateStr = event.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : null
  const location = [event.venue_name, event.city, event.state].filter(Boolean).join(', ')
  const ticketGroups = event.listings.map(l => ({
    tevo_section_name: l.section || 'General Admission',
    retail_price: l.retail_price,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 h-12 flex items-center">
          <Link href="/events" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            ← All Events
          </Link>
        </div>
      </div>

      {/* Photo gallery */}
      {event.images.length > 0 ? (
        <div className="bg-black">
          <div className="max-w-5xl mx-auto">
            <img
              src={event.images[activePhoto]}
              alt={event.title}
              className="w-full h-64 md:h-96 object-cover"
            />
            {event.images.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {event.images.map((src, i) => (
                  <button
                    key={src + i}
                    onClick={() => setActivePhoto(i)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 ${
                      i === activePhoto ? 'border-purple-500' : 'border-transparent opacity-70'
                    }`}
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-purple-700 to-pink-600 text-white">
          <div className="max-w-5xl mx-auto px-4 py-10 flex items-center gap-3">
            <ImageIcon className="w-6 h-6 text-white/60" />
            <span className="text-white/60 text-sm">No photos available for this event</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
        {event.category && (
          <span className="inline-flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full mt-2">
            <Tag className="w-3 h-3" />{event.category}
          </span>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
          {/* Left column — details + seating chart */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
              {dateStr && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-gray-900">{dateStr}</p>
                    {event.start_time && (
                      <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />{event.start_time}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {location && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-gray-700">{location}</p>
                </div>
              )}
              {event.notes && (
                <p className="text-sm text-gray-500 pt-2 border-t border-gray-100">{event.notes}</p>
              )}
            </div>

            {/* Seating chart */}
            {event.venue_id && event.configuration_id ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-5">
                <h2 className="font-bold text-gray-900 mb-3">Seating Chart</h2>
                <div className="h-96 rounded-xl overflow-hidden border border-gray-100">
                  <TicketMap
                    venueId={String(event.venue_id)}
                    configurationId={String(event.configuration_id)}
                    ticketGroups={ticketGroups}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-2xl p-5 text-sm text-gray-400">
                Seating chart isn&apos;t available for this venue.
              </div>
            )}
          </div>

          {/* Right column — ticket options */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 h-fit space-y-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-purple-500" />Ticket Options
            </h2>
            {event.listings.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No tickets currently listed.</p>
            ) : (
              <div className="space-y-2">
                {event.listings
                  .sort((a, b) => a.retail_price - b.retail_price)
                  .map(listing => (
                    <div key={listing.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-xl">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {listing.section || 'General Admission'}{listing.row ? ` · Row ${listing.row}` : ''}
                        </p>
                        <p className="text-xs text-gray-400">
                          {listing.quantity} available{listing.format ? ` · ${listing.format}` : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-800 shrink-0 ml-3">
                        ${listing.retail_price.toLocaleString()}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
