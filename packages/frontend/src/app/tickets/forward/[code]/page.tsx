'use client'

import { useEffect, useState, Suspense } from 'react'
import { useParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { Ticket, Calendar, MapPin, Loader2, CheckCircle, Gift } from 'lucide-react'
import api from '@/lib/api'
import { formatTime } from '@/lib/dateUtils'

interface TicketData {
  id: string
  status: string
  amount_paid: number
  ticket_tiers: { name: string; price: number } | null
  public_events: {
    id: string
    title: string
    event_date: string
    start_time: string | null
    venue_name: string | null
    city: string | null
    state: string | null
    image_url: string | null
  } | null
}

function ForwardLandingContent() {
  const { code } = useParams<{ code: string }>()
  const [loading, setLoading] = useState(true)
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    api.get(`/promoter-events/public/forward/${code.toUpperCase()}`)
      .then(res => setTicket(res.data))
      .catch(err => setError(err.response?.data?.message || 'Invalid or expired link'))
      .finally(() => setLoading(false))
  }, [code])

  const event = ticket?.public_events
  const tier = ticket?.ticket_tiers

  const dateStr = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  const location = [event?.venue_name, event?.city, event?.state].filter(Boolean).join(', ')

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-gray-600 text-sm">Loading your ticket...</p>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <Ticket className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Link Not Found</h1>
        <p className="text-gray-500 text-sm max-w-xs">{error || 'This ticket forward link is invalid or has expired.'}</p>
        <Link href="/tickets/claim" className="mt-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors text-sm">
          Enter Access Code Manually
        </Link>
        <Link href="/events" className="text-purple-600 hover:underline text-sm">Browse events</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-4 py-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Gift className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold">You've been sent a ticket!</h1>
          <p className="text-purple-200 text-sm mt-1">Someone forwarded this ticket to you</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Event info */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {event?.image_url && (
            <img src={event.image_url} alt={event.title ?? ''} className="w-full h-44 object-cover" />
          )}
          <div className="p-5 space-y-3">
            <h2 className="text-xl font-bold text-gray-900">{event?.title}</h2>
            {dateStr && (
              <div className="flex items-start gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 shrink-0 mt-0.5 text-purple-500" />
                <span>{dateStr}{event?.start_time ? ` at ${formatTime(event.start_time)}` : ''}</span>
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

        {/* QR Code */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 self-start">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <p className="text-sm font-semibold text-gray-700">Your Ticket QR Code</p>
          </div>
          <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
            <QRCodeSVG value={ticket.id} size={220} level="H" includeMargin={false} />
          </div>
          <p className="text-xs text-gray-400 font-mono break-all text-center">{ticket.id}</p>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            ticket.status === 'valid' ? 'bg-green-100 text-green-700' :
            ticket.status === 'used' ? 'bg-gray-100 text-gray-500' :
            'bg-red-100 text-red-600'
          }`}>
            {ticket.status === 'valid' ? '✓ Valid — Ready to use' : ticket.status === 'used' ? 'Already scanned' : 'Invalid'}
          </span>
        </div>

        <p className="text-center text-xs text-gray-400">
          Show this QR code at the door. It can only be scanned once. Save this page to your home screen for easy access.
        </p>

        {event?.id && (
          <div className="pb-4 text-center">
            <Link href={`/events/${event.id}`} className="text-purple-600 hover:underline text-sm font-medium">
              View event details →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ForwardLandingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <ForwardLandingContent />
    </Suspense>
  )
}
