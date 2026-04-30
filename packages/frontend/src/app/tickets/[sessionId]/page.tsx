'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { CheckCircle, Calendar, MapPin, Ticket, Loader2 } from 'lucide-react'
import api from '@/lib/api'

interface TicketData {
  id: string
  status: string
  amount_paid: number
  buyer_phone: string | null
  buyer_email: string | null
  stripe_checkout_session_id: string | null
  created_at: string
  ticket_tiers: { name: string; price: number } | null
  public_events: {
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

export default function TicketConfirmationPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!sessionId) return
    api.get(`/promoter-events/public/tickets/${sessionId}`)
      .then(r => setTickets(r.data))
      .catch(e => setError(e.response?.data?.message || 'Could not load tickets'))
      .finally(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || tickets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600 text-lg text-center">{error || 'No tickets found.'}</p>
        <Link href="/events" className="text-purple-600 hover:underline text-sm">← Browse events</Link>
      </div>
    )
  }

  const event = tickets[0].public_events
  const tier = tickets[0].ticket_tiers
  const totalPaid = tickets.reduce((sum, t) => sum + Number(t.amount_paid), 0)

  const dateStr = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  const location = [event?.venue_name, event?.city, event?.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <CheckCircle className="w-7 h-7 shrink-0" />
          <div>
            <p className="font-bold text-lg">You're in!</p>
            <p className="text-green-100 text-sm">
              {tickets.length} ticket{tickets.length > 1 ? 's' : ''} confirmed
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Event info */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {event?.image_url && (
            <img src={event.image_url} alt={event.title} className="w-full h-40 object-cover" />
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
              <span>{tickets.length}× {tier?.name}</span>
              {totalPaid > 0 && (
                <span className="ml-auto font-semibold text-gray-900">${totalPaid.toFixed(2)} paid</span>
              )}
            </div>
          </div>
        </div>

        {/* One QR per ticket */}
        {tickets.map((ticket, i) => (
          <div key={ticket.id} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-gray-700">
              Ticket {tickets.length > 1 ? `${i + 1} of ${tickets.length}` : ''} · {tier?.name}
            </p>
            <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
              <QRCodeSVG
                value={ticket.id}
                size={200}
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
          </div>
        ))}

        <p className="text-center text-xs text-gray-400 pb-4">
          Show this screen at the door. Each QR code can only be scanned once.
        </p>
      </div>
    </div>
  )
}
