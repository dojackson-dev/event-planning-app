'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { CheckCircle, Calendar, MapPin, Ticket, Loader2, Send, X, Check, Phone, Mail } from 'lucide-react'
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

export default function TicketConfirmationPage({ params }: { params: { sessionId: string } }) {
  const { sessionId } = params
  const [tickets, setTickets] = useState<TicketData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  // Forward modal state
  const [forwardTicketId, setForwardTicketId] = useState<string | null>(null)
  const [recipientPhone, setRecipientPhone] = useState('')
  const [recipientEmail, setRecipientEmail] = useState('')
  const [forwarding, setForwarding] = useState(false)
  const [forwardError, setForwardError] = useState('')
  const [forwardedCode, setForwardedCode] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    const MAX_RETRIES = 10
    const RETRY_DELAY = 2500 // ms

    const fetchTickets = async (attempt: number) => {
      try {
        const r = await api.get(`/promoter-events/public/tickets/${sessionId}`)
        if (!cancelled) {
          setTickets(r.data)
          setLoading(false)
        }
      } catch (e: any) {
        if (cancelled) return
        const is404 = e.response?.status === 404
        if (is404 && attempt < MAX_RETRIES) {
          setRetryCount(attempt + 1)
          setTimeout(() => fetchTickets(attempt + 1), RETRY_DELAY)
          return
        }
        setError(e.response?.data?.message || 'Could not load tickets')
        setLoading(false)
      }
    }

    fetchTickets(0)

    return () => { cancelled = true }
  }, [sessionId])

  const openForward = (ticketId: string) => {
    setForwardTicketId(ticketId)
    setRecipientPhone('')
    setRecipientEmail('')
    setForwardError('')
    setForwardedCode(null)
  }

  const closeForward = () => {
    setForwardTicketId(null)
    setForwardedCode(null)
  }

  const handleForward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipientPhone && !recipientEmail) {
      setForwardError('Enter a phone number or email address')
      return
    }
    setForwarding(true); setForwardError('')
    try {
      const res = await api.post(`/promoter-events/public/ticket/${forwardTicketId}/forward`, {
        recipientPhone: recipientPhone || undefined,
        recipientEmail: recipientEmail || undefined,
      })
      setForwardedCode(res.data.code)
    } catch (err: any) {
      setForwardError(err.response?.data?.message || 'Failed to forward ticket')
    } finally {
      setForwarding(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-gray-600 text-sm font-medium">
          {retryCount === 0 ? 'Loading your tickets…' : 'Confirming your payment…'}
        </p>
        {retryCount > 0 && (
          <p className="text-gray-400 text-xs">This can take a few seconds</p>
        )}
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
            <div className="w-full flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">
                Ticket {tickets.length > 1 ? `${i + 1} of ${tickets.length}` : ''} · {ticket.ticket_tiers?.name ?? tier?.name}
              </p>
              <button
                onClick={() => openForward(ticket.id)}
                className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-800 font-medium px-3 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
              >
                <Send className="w-3.5 h-3.5" /> Forward ticket
              </button>
            </div>
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

        <p className="text-center text-xs text-gray-400">
          Show this screen at the door. Each QR code can only be scanned once.
        </p>

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

      {/* Forward Ticket Modal */}
      {forwardTicketId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Forward Ticket</h3>
              <button onClick={closeForward} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {forwardedCode ? (
                <div className="text-center space-y-4">
                  <Check className="w-10 h-10 text-green-500 mx-auto" />
                  <p className="font-semibold text-gray-900">Ticket forwarded!</p>
                  <p className="text-sm text-gray-500">The recipient was sent the access code:</p>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl py-3 px-4">
                    <p className="text-3xl font-black tracking-widest text-purple-700 font-mono">{forwardedCode}</p>
                  </div>
                  <p className="text-xs text-gray-400">They can use this code at <strong>eventecos.com/tickets/claim</strong></p>
                  <button onClick={closeForward} className="w-full bg-purple-600 text-white font-semibold py-2.5 rounded-xl hover:bg-purple-700 transition-colors">
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForward} className="space-y-4">
                  <p className="text-sm text-gray-500">Send an access code to the recipient so they can view this ticket.</p>

                  {forwardError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{forwardError}</div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone number</span>
                    </label>
                    <input
                      type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="text-center text-xs text-gray-400">— or —</div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email address</span>
                    </label>
                    <input
                      type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)}
                      placeholder="recipient@email.com"
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <button type="submit" disabled={forwarding}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-semibold py-3 rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-60">
                    {forwarding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Access Code
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
