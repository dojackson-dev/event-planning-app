'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { Calendar, MapPin, Ticket, Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface TicketData {
  id: string
  status: string
  amount_paid: number
  buyer_phone: string | null
  buyer_email: string | null
  created_at: string
  ticket_tiers: { name: string; price: number } | null
  public_events: {
    id: string
    title: string
    event_date: string
    start_time: string | null
    venue_name: string | null
    venue_address: string | null
    city: string | null
    state: string | null
    image_url: string | null
  } | null
}

export default function SingleTicketPage({ params }: { params: { ticketId: string } }) {
  const { ticketId } = params
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ticketId) return
    api.get(`/promoter-events/public/ticket/${ticketId}`)
      .then(r => setTicket(r.data))
      .catch(e => setError(e.response?.data?.message || 'Could not load ticket'))
      .finally(() => setLoading(false))
  }, [ticketId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600 text-lg text-center">{error || 'Ticket not found.'}</p>
        <Link href="/events" className="text-purple-600 hover:underline text-sm">← Browse events</Link>
      </div>
    )
  }

  const event = ticket.public_events
  const tier = ticket.ticket_tiers

  const dateStr = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  const location = [event?.venue_name, event?.city, event?.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-600 text-white px-4 py-5">
        <div className="max-w-lg mx-auto">
          <p className="font-bold text-lg">{event?.title}</p>
          <p className="text-purple-200 text-sm">{tier?.name} Ticket</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Event info card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {event?.image_url && (
            <img src={event.image_url} alt={event.title ?? ''} className="w-full h-40 object-cover" />
          )}
          <div className="p-5 space-y-3">
            <h1 className="text-xl font-bold text-gray-900">{event?.title}</h1>
            {dateStr && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-purple-500" />
                <span>{dateStr}{event?.start_time ? ` at ${event.start_time}` : ''}</span>
              </div>
            )}
            {location && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-purple-500" />
                <span>{location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Ticket className="w-4 h-4 shrink-0 text-purple-500" />
              <span>{tier?.name}</span>
            </div>
          </div>
        </div>

        {/* QR code card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center gap-4">
          <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
            <QRCodeSVG
              value={ticket.id}
              size={220}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-xs text-gray-400 font-mono break-all text-center">{ticket.id}</p>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            ticket.status === 'valid' ? 'bg-green-100 text-green-700' :
            ticket.status === 'used' ? 'bg-gray-100 text-gray-500' :
            'bg-red-100 text-red-600'
          }`}>
            {ticket.status === 'valid' ? '✓ Valid' : ticket.status === 'used' ? 'Already scanned' : 'Invalid'}
          </span>
          <p className="text-xs text-gray-400 text-center">
            Show this QR code at the door. It can only be scanned once.
          </p>
        </div>

        {event?.id && (
          <div className="pb-4 text-center">
            <Link
              href={`/events/${event.id}`}
              className="text-purple-600 hover:underline text-sm font-medium"
            >
              ← Back to event page
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
