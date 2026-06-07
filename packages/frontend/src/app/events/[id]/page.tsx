'use client'

import { useState, useEffect } from 'react'
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

interface VipPackage {
  id: string
  name: string
  package_type: string
  price: number
  capacity: number
  inventory: number
  inventory_sold: number
  status: string
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

export default function PublicEventDetailPage({ params }: { params: { id: string } }) {
  const { id } = params
  const searchParams = useSearchParams()

  const [event, setEvent] = useState<PublicEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Ticket purchase — per-tier quantities
  const [tierQtys, setTierQtys] = useState<Record<string, number>>({})
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')
  const [vipPackages, setVipPackages] = useState<VipPackage[]>([])

  const successSession = searchParams?.get('session_id')
  const paidParam = searchParams?.get('paid') === 'true'
  const vipPaid = searchParams?.get('vip_paid') === 'true'

  useEffect(() => {
    if (!id) return
    api.get(`/promoter-events/public/${id}`)
      .then(r => {
        setEvent(r.data)
      })
      .catch(e => setError(e.response?.data?.message || 'Event not found'))
      .finally(() => setLoading(false))
    api.get(`/vip/public/events/${id}`)
      .then(r => setVipPackages((r.data.packages || []).filter((p: VipPackage) => p.status !== 'hidden' && p.inventory_sold < p.inventory)))
      .catch(() => {})
  }, [id])

  // Fire verify-payment on redirect back from Stripe to trigger email/SMS
  useEffect(() => {
    if (!id || !successSession || !paidParam) return
    api.post(`/promoter-events/public/${id}/verify-payment`, { session_id: successSession })
      .catch(() => {}) // non-fatal — webhook will handle it if this fails
  }, [id, successSession, paidParam])

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault()
    const items = Object.entries(tierQtys)
      .filter(([, qty]) => qty > 0)
      .map(([tier_id, quantity]) => ({ tier_id, quantity }))
    if (items.length === 0 || !buyerEmail) return
    setPurchaseError(''); setPurchasing(true)
    try {
      const res = await api.post(`/promoter-events/public/${id}/checkout`, {
        items,
        buyer_email: buyerEmail,
        ...(buyerPhone ? { buyer_phone: buyerPhone } : {}),
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

  // Fee breakdown (mirrors backend grossUp)
  const STRIPE_PCT   = 0.029
  const STRIPE_FIXED = 0.30
  const APP_FEE_RATE = 0.03

  const totalItems = Object.entries(tierQtys).filter(([, q]) => q > 0)
  const faceValue = totalItems.reduce((sum, [tierId, qty]) => {
    const tier = event.ticket_tiers.find(t => t.id === tierId)
    return sum + (tier ? Number(tier.price) * qty : 0)
  }, 0)
  const totalTickets = totalItems.reduce((sum, [, qty]) => sum + qty, 0)
  const totalCharge = faceValue > 0
    ? Math.ceil((faceValue * 100 + STRIPE_FIXED * 100) / (1 - STRIPE_PCT - APP_FEE_RATE)) / 100
    : 0
  const serviceFee = +(totalCharge - faceValue).toFixed(2)

  const adjustQty = (tierId: string, delta: number, max: number) => {
    setTierQtys(prev => {
      const cur = prev[tierId] ?? 0
      const next = Math.max(0, Math.min(max, Math.min(10, cur + delta)))
      return { ...prev, [tierId]: next }
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Full success state after Stripe redirect */}
      {paidParam && successSession && (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-green-100 max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You're in!</h1>
            <p className="text-gray-600 mb-1">Payment confirmed.</p>
            <p className="text-sm text-gray-500 mb-6">Check your email and phone for your tickets and QR codes.</p>
            <div className="space-y-3">
              <Link
                href={`/tickets/${successSession}`}
                className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition"
              >
                <Ticket className="w-4 h-4" />
                View My Tickets
              </Link>
              <Link
                href={`/events/${id}`}
                className="flex items-center justify-center gap-2 w-full bg-white border border-gray-200 text-gray-700 font-medium py-3 px-4 rounded-xl hover:bg-gray-50 transition"
                onClick={() => { /* clear query params by navigating without them */ }}
              >
                <Calendar className="w-4 h-4" />
                Back to Event
              </Link>
              <Link
                href="/events"
                className="block text-sm text-gray-400 hover:text-gray-600 pt-1"
              >
                Browse more events →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* VIP success state */}
      {vipPaid && !paidParam && (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-purple-100 max-w-md w-full p-8 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">VIP Confirmed! 👑</h1>
            <p className="text-gray-600 mb-1">Your VIP package is booked.</p>
            <p className="text-sm text-gray-500 mb-6">Check your email and phone for your confirmation and QR code.</p>
            <div className="space-y-3">
              <Link
                href={`/events/${id}`}
                className="flex items-center justify-center gap-2 w-full bg-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-purple-700 transition"
              >
                <Calendar className="w-4 h-4" />
                Back to Event
              </Link>
              <Link
                href="/events"
                className="block text-sm text-gray-400 hover:text-gray-600 pt-1"
              >
                Browse more events →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Normal event page (only shown when no success state) */}
      {!paidParam && !vipPaid && (<>
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

            {/* VIP upsell - first option */}
            <Link href={`/events/${id}/vip`}
              className="block p-3 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-600 text-base">👑</span>
                  <span className="font-bold text-yellow-800 text-sm">VIP Concierge</span>
                </div>
                <span className="text-xs text-yellow-600 font-medium">View packages →</span>
              </div>
              {vipPackages.length > 0 ? (
                <div className="space-y-1">
                  {vipPackages.slice(0, 3).map(pkg => (
                    <div key={pkg.id} className="flex items-center justify-between text-xs">
                      <span className="text-yellow-800 font-medium truncate pr-2">{pkg.name}</span>
                      <span className="text-yellow-700 font-bold shrink-0">${Number(pkg.price).toLocaleString()}</span>
                    </div>
                  ))}
                  {vipPackages.length > 3 && (
                    <p className="text-xs text-yellow-600 pt-0.5">+{vipPackages.length - 3} more packages</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-yellow-700">Tables, booths, bottle service &amp; more</p>
              )}
            </Link>

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
                {/* Per-tier quantity selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Tickets</label>
                  <div className="space-y-2">
                    {event.ticket_tiers.map(tier => {
                      const avail = tier.quantity - tier.quantity_sold
                      const soldOut = avail <= 0
                      const qty = tierQtys[tier.id] ?? 0
                      return (
                        <div key={tier.id} className={`flex items-center justify-between p-3 border-2 rounded-xl transition ${
                          soldOut ? 'opacity-50 border-gray-200 bg-gray-50' :
                          qty > 0 ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                        }`}>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800">{tier.name}</p>
                            {tier.description && <p className="text-xs text-gray-500 truncate">{tier.description}</p>}
                            <p className="text-xs text-gray-400">{soldOut ? 'Sold out' : `${avail} left`}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-3">
                            <span className="text-sm font-bold text-gray-800 w-14 text-right">
                              {Number(tier.price) === 0 ? 'Free' : `$${Number(tier.price).toFixed(2)}`}
                            </span>
                            {!soldOut && (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => adjustQty(tier.id, -1, avail)}
                                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-100 disabled:opacity-40"
                                  disabled={qty === 0}>
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-semibold tabular-nums">{qty}</span>
                                <button type="button" onClick={() => adjustQty(tier.id, 1, avail)}
                                  className="w-7 h-7 rounded-full border border-purple-400 bg-purple-50 text-purple-700 flex items-center justify-center hover:bg-purple-100 disabled:opacity-40"
                                  disabled={qty >= Math.min(10, avail)}>
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {totalTickets > 0 && (
                    <p className="text-xs text-gray-400 mt-1.5">{totalTickets} ticket{totalTickets !== 1 ? 's' : ''} selected · max 10 per type</p>
                  )}
                </div>

                {/* Email + Phone */}
                {totalTickets > 0 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} required
                        placeholder="your@email.com"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                      <p className="text-xs text-gray-400 mt-1">Your tickets will be sent here</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                      <input type="tel" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
                      <p className="text-xs text-gray-400 mt-1">Get a text confirmation</p>
                    </div>
                  </>
                )}

                {purchaseError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-xs">{purchaseError}</div>
                )}

                {/* Order summary + checkout button */}
                {totalTickets > 0 && (
                  <div className="border-t border-gray-100 pt-3 space-y-1.5">
                    {totalItems.map(([tierId, qty]) => {
                      const tier = event.ticket_tiers.find(t => t.id === tierId)
                      if (!tier) return null
                      return (
                        <div key={tierId} className="flex justify-between text-sm">
                          <span className="text-gray-600">{qty} × {tier.name}</span>
                          <span className="font-medium">
                            {Number(tier.price) === 0 ? 'Free' : `$${(Number(tier.price) * qty).toFixed(2)}`}
                          </span>
                        </div>
                      )
                    })}
                    {faceValue > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Service fee</span>
                        <span className="text-gray-500">${serviceFee.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5 mt-1.5">
                      <span className="text-gray-800">Total</span>
                      <span>{faceValue === 0 ? 'Free' : `$${totalCharge.toFixed(2)}`}</span>
                    </div>
                    <button type="submit" disabled={purchasing || !buyerEmail}
                      className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-3 rounded-xl hover:bg-purple-700 disabled:opacity-60 mt-2">
                      {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                      {purchasing ? 'Redirecting...' : `Buy ${totalTickets} Ticket${totalTickets !== 1 ? 's' : ''}`}
                    </button>
                    <p className="text-xs text-center text-gray-400 mt-2">Secure checkout via Stripe</p>
                  </div>
                )}
              </form>
            )}
          </div>


        </div>
      </div>
    </>)}
    </div>
  )
}
