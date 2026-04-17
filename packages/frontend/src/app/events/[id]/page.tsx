'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import {
  MapPin, Clock, Tag, Ticket, Loader2, CheckCircle,
  Calendar, Users, Minus, Plus, ExternalLink,
} from 'lucide-react'

interface TicketTier {
  id: string
  name: string
  price: number
  quantity: number
  quantity_sold: number
  description: string | null
}

interface PromoterAccount {
  company_name: string | null
  contact_name: string
  instagram: string | null
  website: string | null
}

interface PublicEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  venue_address: string | null
  city: string | null
  state: string | null
  category: string | null
  image_url: string | null
  age_restriction: string | null
  ticket_tiers: TicketTier[]
  promoter_accounts: PromoterAccount | null
}

export default function PublicEventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()

  const [event, setEvent] = useState<PublicEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Ticket purchase
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [buyerEmail, setBuyerEmail] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')

  const successSession = searchParams?.get('success')

  useEffect(() => {
    if (!id) return
    api.get(`/promoter-events/public/${id}`)
      .then(r => {
        setEvent(r.data)
        if (r.data.ticket_tiers?.length > 0) setSelectedTier(r.data.ticket_tiers[0])
      })
      .catch(e => setError(e.response?.data?.message || 'Event not found'))
      .finally(() => setLoading(false))
  }, [id])

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTier || !buyerEmail) return
    setPurchaseError(''); setPurchasing(true)
    try {
      const res = await api.post(`/promoter-events/public/${id}/checkout`, {
        tier_id: selectedTier.id,
        quantity,
        buyer_email: buyerEmail,
      })
      if (res.data?.url) {
        window.location.href = res.data.url
      }
    } catch (err: any) {
      setPurchaseError(err.response?.data?.message || 'Checkout failed — please try again')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
        <p className="text-gray-600 text-lg">{error || 'Event not found'}</p>
        <Link href="/events" className="text-purple-600 hover:underline text-sm">← Browse all events</Link>
      </div>
    )
  }

  const dateObj = new Date(event.event_date + 'T00:00:00')
  const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const promoterName = event.promoter_accounts?.company_name || event.promoter_accounts?.contact_name
  const isSoldOut = event.ticket_tiers.length > 0 &&
    event.ticket_tiers.every(t => t.quantity_sold >= t.quantity)
  const tierAvail = selectedTier ? selectedTier.quantity - selectedTier.quantity_sold : 0

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sucess state after Stripe redirect */}
      {successSession && (
        <div className="bg-green-50 border-b border-green-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-green-800 font-semibold text-sm">Payment successful! Check your email for your ticket.</p>
              <p className="text-green-700 text-xs">Your ticket has been sent to your email address.</p>
            </div>
          </div>
        </div>
      )}

      {/* Back nav */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 h-12 flex items-center">
          <Link href="/events" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            ← All Events
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-purple-700 to-pink-600 text-white">
        {event.image_url ? (
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img src={event.image_url} alt={event.title}
              className="w-full h-full object-cover opacity-40" />
            <div className="absolute inset-0 flex items-end">
              <div className="max-w-4xl mx-auto px-4 pb-6 w-full">
                <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
                {promoterName && <p className="text-purple-200 mt-1">By {promoterName}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto px-4 py-10">
            <h1 className="text-3xl md:text-4xl font-bold">{event.title}</h1>
            {promoterName && <p className="text-purple-200 mt-1">By {promoterName}</p>}
          </div>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event details — left/main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key info */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">{dateStr}</p>
                {(event.start_time || event.end_time) && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    {event.start_time}{event.end_time ? ` – ${event.end_time}` : ''}
                  </p>
                )}
              </div>
            </div>
            {(event.venue_name || event.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                <div>
                  {event.venue_name && <p className="font-semibold text-gray-900">{event.venue_name}</p>}
                  <p className="text-sm text-gray-500">
                    {[event.venue_address, event.city, event.state].filter(Boolean).join(', ')}
                  </p>
                </div>
              </div>
            )}
            {event.category && (
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-purple-500 shrink-0" />
                <span className="text-sm text-gray-700">{event.category}</span>
              </div>
            )}
            {event.age_restriction && (
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-500 shrink-0" />
                <span className="text-sm text-gray-700">{event.age_restriction} only</span>
              </div>
            )}
          </div>

          {/* Description */}
          {event.description && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-3">About this event</h2>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {/* Promoter */}
          {event.promoter_accounts && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="font-bold text-gray-900 mb-2">Presented by</h2>
              <p className="font-semibold text-gray-800">{promoterName}</p>
              <div className="flex gap-3 mt-2">
                {event.promoter_accounts.instagram && (
                  <a href={`https://instagram.com/${event.promoter_accounts.instagram.replace('@','')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Instagram
                  </a>
                )}
                {event.promoter_accounts.website && (
                  <a href={event.promoter_accounts.website} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Website
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ticket purchase sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 sticky top-4 space-y-4">
            <h2 className="font-bold text-gray-900">Get Tickets</h2>

            {event.ticket_tiers.length === 0 ? (
              <div className="text-center py-6">
                <Ticket className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Tickets not available yet</p>
              </div>
            ) : isSoldOut ? (
              <div className="text-center py-6">
                <p className="font-bold text-red-500 text-lg">Sold Out</p>
                <p className="text-sm text-gray-400 mt-1">All tickets have been sold</p>
              </div>
            ) : (
              <form onSubmit={handlePurchase} className="space-y-4">
                {/* Tier selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ticket Type</label>
                  <div className="space-y-2">
                    {event.ticket_tiers.map(tier => {
                      const avail = tier.quantity - tier.quantity_sold
                      const soldOut = avail <= 0
                      return (
                        <label key={tier.id} className={`flex items-center justify-between p-3 border-2 rounded-xl cursor-pointer transition ${
                          soldOut ? 'opacity-50 cursor-not-allowed border-gray-200' :
                          selectedTier?.id === tier.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <div className="flex items-center gap-2">
                            <input type="radio" className="sr-only" checked={selectedTier?.id === tier.id}
                              disabled={soldOut} onChange={() => { setSelectedTier(tier); setQuantity(1) }} />
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{tier.name}</p>
                              {tier.description && <p className="text-xs text-gray-500">{tier.description}</p>}
                              {soldOut ? (
                                <p className="text-xs text-red-500 font-medium">Sold out</p>
                              ) : (
                                <p className="text-xs text-gray-400">{avail} remaining</p>
                              )}
                            </div>
                          </div>
                          <span className="font-bold text-gray-900 shrink-0">
                            {Number(tier.price) === 0 ? 'Free' : `$${Number(tier.price).toFixed(2)}`}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Quantity */}
                {selectedTier && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-semibold">{quantity}</span>
                      <button type="button"
                        onClick={() => setQuantity(q => Math.min(tierAvail, Math.min(10, q + 1)))}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-gray-500">max 10 per order</span>
                    </div>
                  </div>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} required
                    placeholder="your@email.com"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                  <p className="text-xs text-gray-400 mt-1">Your ticket will be sent here</p>
                </div>

                {purchaseError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">{purchaseError}</div>
                )}

                {/* Total + checkout button */}
                {selectedTier && (
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-gray-600">{quantity} × {selectedTier.name}</span>
                      <span className="font-bold">
                        {Number(selectedTier.price) === 0 ? 'Free' : `$${(Number(selectedTier.price) * quantity).toFixed(2)}`}
                      </span>
                    </div>
                    <button type="submit" disabled={purchasing}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-60">
                      {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                      {purchasing ? 'Redirecting...' : 'Buy Tickets'}
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-2">Secure checkout via Stripe</p>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
