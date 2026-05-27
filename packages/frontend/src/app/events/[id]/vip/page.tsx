'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import {
  Crown, Users, DollarSign, Star, Loader2, CheckCircle,
  ArrowLeft, Package, Wine, Utensils, Shield, Headphones,
  ChevronDown, ChevronUp, Plus, Minus, MapPin, Clock,
} from 'lucide-react'

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  table: 'VIP Table', booth: 'VIP Booth', section: 'VIP Section', seat: 'Reserved Seat',
  sponsor_table: 'Sponsor Table', cabana: 'Cabana / Suite', meet_greet: 'Meet & Greet',
  lounge: 'Lounge Package', private_room: 'Private Room', custom: 'Custom VIP',
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  bar: Wine, kitchen: Utensils, concierge: Headphones, security: Shield, other: Package,
}

interface VipPackage {
  id: string
  name: string
  package_type: string
  description: string | null
  price: number
  capacity: number
  included_tickets: number
  table_label: string | null
  inventory: number
  inventory_sold: number
  requires_concierge: boolean
  status: string
  vip_sections?: { name: string } | null
}

interface ServiceItem {
  id: string
  name: string
  category: string
  price: number
  requires_approval: boolean
  allow_special_request: boolean
  special_request_prompt: string | null
  notes: string | null
}

interface Layout {
  id: string
  file_url: string
  file_type: string
  description: string | null
}

export default function EventVipPage({ params }: { params: { id: string } }) {
  const { id: eventId } = params
  const searchParams = useSearchParams()

  const [packages, setPackages] = useState<VipPackage[]>([])
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([])
  const [layout, setLayout] = useState<Layout | null>(null)
  const [loading, setLoading] = useState(true)
  const [eventTitle, setEventTitle] = useState('')

  const [selectedPkg, setSelectedPkg] = useState<VipPackage | null>(null)
  const [selectedServices, setSelectedServices] = useState<Record<string, number>>({})
  const [serviceRequests, setServiceRequests] = useState<Record<string, string>>({})
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseError, setPurchaseError] = useState('')

  const [showLayout, setShowLayout] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [vipRes, eventRes] = await Promise.all([
          api.get(`/vip/public/events/${eventId}`),
          api.get(`/promoter-events/public/${eventId}`),
        ])
        setPackages(vipRes.data.packages || [])
        setServiceItems(vipRes.data.service_items || [])
        setLayout(vipRes.data.layout || null)
        setEventTitle(eventRes.data?.title || 'Event')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [eventId])

  useEffect(() => {
    if (searchParams.get('vip_paid') === 'true') setSuccess(true)
  }, [searchParams])

  const serviceTotal = Object.entries(selectedServices).reduce((sum, [id, qty]) => {
    const item = serviceItems.find(s => s.id === id)
    return sum + (item ? Number(item.price) * qty : 0)
  }, 0)

  const packagePrice = selectedPkg ? Number(selectedPkg.price) : 0
  const subtotal = packagePrice + serviceTotal
  const platformFee = Math.ceil(subtotal * 0.03 * 100) / 100
  const total = subtotal + platformFee

  const adjustService = (id: string, delta: number) => {
    setSelectedServices(prev => {
      const current = prev[id] ?? 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: next }
    })
  }

  const handlePurchase = async () => {
    if (!selectedPkg || !buyerEmail) return
    setPurchasing(true)
    setPurchaseError('')
    try {
      const serviceItemsPayload = Object.entries(selectedServices).map(([service_item_id, quantity]) => ({
        service_item_id,
        quantity,
        ...(serviceRequests[service_item_id] ? { special_request: serviceRequests[service_item_id] } : {}),
      }))
      const res = await api.post(
        `/vip/public/events/${eventId}/packages/${selectedPkg.id}/checkout`,
        {
          buyer_name: buyerName || undefined,
          buyer_email: buyerEmail,
          buyer_phone: buyerPhone || undefined,
          service_items: serviceItemsPayload.length > 0 ? serviceItemsPayload : undefined,
          return_url: `${window.location.origin}/events/${eventId}/vip`,
        },
      )
      window.location.href = res.data.url
    } catch (err: any) {
      setPurchaseError(err.response?.data?.message || 'Unable to start checkout. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">VIP Package Confirmed!</h1>
        <p className="text-gray-600 mb-6">Your VIP experience has been booked. Check your email for your confirmation and QR code.</p>
        <Link href={`/events/${eventId}`} className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-sm font-medium">
          Back to Event
        </Link>
      </div>
    )
  }

  if (packages.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <Crown className="w-12 h-12 text-purple-300 mx-auto mb-4" />
        <p className="text-gray-500">No VIP packages available for this event.</p>
        <Link href={`/events/${eventId}`} className="mt-4 inline-flex items-center gap-1 text-purple-600 hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> General Admission
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <Link href={`/events/${eventId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> {eventTitle}
      </Link>

      <div className="flex items-center gap-3 mb-8">
        <Crown className="w-8 h-8 text-yellow-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">VIP Concierge Suite</h1>
          <p className="text-gray-500 text-sm">Select your premium experience</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: packages + services */}
        <div className="lg:col-span-2 space-y-6">
          {/* Floor plan toggle */}
          {layout && (
            <button
              onClick={() => setShowLayout(!showLayout)}
              className="w-full flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 hover:bg-purple-100"
            >
              <span className="font-medium flex items-center gap-2"><MapPin className="w-4 h-4" /> View Floor Plan / Seating Chart</span>
              {showLayout ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
          {showLayout && layout && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              {layout.file_type === 'image' ? (
                <img src={layout.file_url} alt="Floor plan" className="w-full object-contain max-h-80" />
              ) : (
                <a href={layout.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-6 text-purple-600 hover:underline">
                  View PDF Floor Plan
                </a>
              )}
              {layout.description && <p className="text-xs text-gray-500 text-center py-2">{layout.description}</p>}
            </div>
          )}

          {/* Package cards */}
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Select Your VIP Package</h2>
            {packages.map(pkg => {
              const soldOut = pkg.status === 'sold_out' || pkg.inventory_sold >= pkg.inventory
              const isSelected = selectedPkg?.id === pkg.id
              return (
                <button
                  key={pkg.id}
                  onClick={() => !soldOut && setSelectedPkg(isSelected ? null : pkg)}
                  disabled={soldOut}
                  className={`w-full text-left p-5 rounded-xl border-2 transition-all ${
                    soldOut
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'border-purple-600 bg-purple-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-purple-600' : 'bg-purple-100'}`}>
                        <Crown className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-purple-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{pkg.name}</span>
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                            {PACKAGE_TYPE_LABELS[pkg.package_type] || pkg.package_type}
                          </span>
                          {soldOut && <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Sold Out</span>}
                        </div>
                        {pkg.vip_sections && <span className="text-xs text-gray-500">{pkg.vip_sections.name}</span>}
                      </div>
                    </div>
                    <span className="text-2xl font-bold text-gray-900">${Number(pkg.price).toLocaleString()}</span>
                  </div>

                  {pkg.description && <p className="text-sm text-gray-600 mb-3">{pkg.description}</p>}

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Up to {pkg.capacity} guests</span>
                    {pkg.included_tickets > 0 && <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" /> {pkg.included_tickets} admission tickets included</span>}
                    {pkg.table_label && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {pkg.table_label}</span>}
                    {pkg.requires_concierge && <span className="flex items-center gap-1 text-purple-600"><Star className="w-3 h-3" /> Dedicated concierge</span>}
                    {!soldOut && <span className="text-gray-400">{pkg.inventory - pkg.inventory_sold} remaining</span>}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Service add-ons */}
          {selectedPkg && serviceItems.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Wine className="w-4 h-4 text-purple-500" />
                Add to Your Experience
              </h3>
              <div className="space-y-3">
                {serviceItems.map(item => {
                  const qty = selectedServices[item.id] ?? 0
                  const Icon = CATEGORY_ICONS[item.category] || Package
                  return (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-800">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              ${Number(item.price).toFixed(0)} each
                              {item.requires_approval && ' · Approval required'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {qty > 0 && (
                            <button onClick={() => adjustService(item.id, -1)} className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300">
                              <Minus className="w-3 h-3" />
                            </button>
                          )}
                          {qty > 0 && <span className="w-6 text-center text-sm font-medium">{qty}</span>}
                          <button onClick={() => adjustService(item.id, 1)} className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center hover:bg-purple-200">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {qty > 0 && item.allow_special_request && (
                        <div className="mt-2">
                          <input
                            value={serviceRequests[item.id] || ''}
                            onChange={e => setServiceRequests(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder={item.special_request_prompt || 'Special request...'}
                            className="w-full border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-gray-700 bg-purple-50 placeholder-gray-400"
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: checkout */}
        <div className="lg:col-span-1">
          <div className="sticky top-6 bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-900 mb-5">
              {selectedPkg ? 'Complete Your Booking' : 'Select a Package'}
            </h3>

            {selectedPkg && (
              <>
                {/* Order summary */}
                <div className="mb-5 p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700">{selectedPkg.name}</span>
                    <span className="font-semibold">${Number(selectedPkg.price).toFixed(0)}</span>
                  </div>
                  {Object.entries(selectedServices).map(([id, qty]) => {
                    const item = serviceItems.find(s => s.id === id)
                    if (!item) return null
                    return (
                      <div key={id} className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{item.name} ×{qty}</span>
                        <span>${(Number(item.price) * qty).toFixed(0)}</span>
                      </div>
                    )
                  })}
                  <div className="border-t border-purple-200 mt-2 pt-2 flex justify-between text-xs text-gray-500">
                    <span>Platform fee (3%)</span>
                    <span>${platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 mt-2 pt-2 border-t border-purple-200">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Buyer info */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      placeholder="Full name"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={buyerEmail}
                      onChange={e => setBuyerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={buyerPhone}
                      onChange={e => setBuyerPhone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                {purchaseError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {purchaseError}
                  </div>
                )}

                <button
                  onClick={handlePurchase}
                  disabled={!buyerEmail || purchasing}
                  className="mt-5 w-full flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-semibold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                  {purchasing ? 'Redirecting...' : `Book VIP — $${total.toFixed(0)}`}
                </button>

                <p className="text-center text-xs text-gray-400 mt-3">Secure checkout via Stripe</p>
              </>
            )}

            {!selectedPkg && (
              <div className="text-center py-6 text-gray-400">
                <Crown className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Choose a VIP package to continue</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
