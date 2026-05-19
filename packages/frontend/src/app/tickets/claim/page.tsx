'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { Ticket, Calendar, MapPin, Loader2, KeyRound } from 'lucide-react'
import api from '@/lib/api'

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

function ClaimContent() {
  const searchParams = useSearchParams()
  const initialCode = searchParams.get('code')?.toUpperCase() || ''

  const [code, setCode] = useState(initialCode)
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState<TicketData | null>(null)
  const [error, setError] = useState('')

  // Auto-claim if code came from the URL
  useEffect(() => {
    if (initialCode) handleClaim(initialCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClaim = async (claimCode?: string) => {
    const useCode = (claimCode || code).trim().toUpperCase()
    if (!useCode) { setError('Enter your access code'); return }
    setLoading(true); setError('')
    try {
      const res = await api.get(`/promoter-events/public/forward/${useCode}`)
      setTicket(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  const event = ticket?.public_events
  const tier = ticket?.ticket_tiers

  const dateStr = event?.event_date
    ? new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
      })
    : ''

  const location = [event?.venue_name, event?.city, event?.state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-purple-600 text-white px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Ticket className="w-7 h-7 shrink-0" />
          <div>
            <p className="font-bold text-lg">Claim Your Ticket</p>
            <p className="text-purple-200 text-sm">Enter your forwarded access code</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {!ticket ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-gray-700 mb-1">
              <KeyRound className="w-5 h-5 text-purple-500" />
              <span className="font-semibold">Enter Access Code</span>
            </div>
            <p className="text-sm text-gray-500">
              Someone forwarded you a ticket. Enter the code they sent you via text or email.
            </p>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
            )}

            <form onSubmit={e => { e.preventDefault(); handleClaim() }} className="space-y-3">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AX7K9M3"
                maxLength={8}
                autoFocus
                autoComplete="off"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-2xl font-mono font-bold tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                View My Ticket
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Event info */}
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

            {/* QR Code */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-gray-700 self-start">Your Ticket</p>
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <QRCodeSVG value={ticket.id} size={200} level="H" includeMargin={false} />
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

            <p className="text-center text-xs text-gray-400">
              Show this screen at the door. The QR code can only be scanned once.
            </p>

            {event?.id && (
              <div className="pb-4 text-center">
                <Link href={`/events/${event.id}`} className="text-purple-600 hover:underline text-sm font-medium">
                  ← View event details
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function ClaimPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    }>
      <ClaimContent />
    </Suspense>
  )
}
