'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { Crown, Calendar, MapPin, Loader2, CheckCircle, Clock, Users } from 'lucide-react'
import api from '@/lib/api'

interface VipOrder {
  id: string
  buyer_name: string | null
  buyer_email: string | null
  total_price: number
  payment_status: string
  check_in_status: string
  qr_code: string
  created_at: string
  public_event_id: string
  vip_packages: {
    name: string
    package_type: string
    capacity: number
    included_tickets: number
    table_label: string | null
    vip_sections: { name: string } | null
  } | null
  vip_guest_passes: { id: string; guest_name: string | null; status: string }[]
  vip_service_orders: {
    id: string
    quantity: number
    status: string
    vip_service_items: { name: string; category: string } | null
  }[]
}

export default function VipOrderPage({ params }: { params: { qrCode: string } }) {
  const { qrCode } = params
  const [order, setOrder] = useState<VipOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (!qrCode) return
    let cancelled = false
    const MAX_RETRIES = 8
    const RETRY_DELAY = 2500

    const fetchOrder = async (attempt: number) => {
      try {
        const r = await api.get(`/vip/public/orders/qr/${encodeURIComponent(qrCode)}`)
        if (!cancelled) {
          setOrder(r.data)
          setLoading(false)
        }
      } catch (e: any) {
        if (cancelled) return
        if (attempt < MAX_RETRIES) {
          setTimeout(() => fetchOrder(attempt + 1), RETRY_DELAY)
          setRetryCount(attempt + 1)
        } else {
          setError(e.response?.data?.message || 'VIP order not found')
          setLoading(false)
        }
      }
    }
    fetchOrder(0)
    return () => { cancelled = true }
  }, [qrCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 flex items-center justify-center flex-col gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        {retryCount > 0 && (
          <p className="text-sm text-gray-500">Fetching your order... ({retryCount}/{8})</p>
        )}
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4 px-4">
        <Crown className="w-12 h-12 text-gray-300" />
        <p className="text-gray-600 text-lg text-center">{error || 'VIP order not found'}</p>
        <Link href="/events" className="text-purple-600 hover:underline text-sm">Browse events →</Link>
      </div>
    )
  }

  const pkg = order.vip_packages
  const event = order.public_event_id
  const isCheckedIn = order.check_in_status === 'checked_in'
  const services = order.vip_service_orders.filter(s => s.vip_service_items)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/events" className="text-sm text-gray-500 hover:text-gray-700">← Events</Link>
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="font-bold text-gray-900 text-sm">VIP Access</span>
          </div>
          <div className="w-16" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        {/* Status */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${
            isCheckedIn ? 'bg-gray-100' : 'bg-green-100'
          }`}>
            <CheckCircle className={`w-8 h-8 ${isCheckedIn ? 'text-gray-400' : 'text-green-600'}`} />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            {isCheckedIn ? 'Checked In ✓' : 'VIP Package Confirmed 👑'}
          </h1>
          {order.buyer_name && (
            <p className="text-gray-600 text-sm">Welcome, {order.buyer_name}</p>
          )}
        </div>

        {/* QR Code */}
        {!isCheckedIn && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-sm p-6 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4 font-medium">Show at VIP Entrance</p>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-inner">
                <QRCodeSVG
                  value={order.qr_code}
                  size={220}
                  level="H"
                  includeMargin
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 font-mono break-all">{order.qr_code}</p>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
              📱 This QR code can only be scanned once. Keep it safe.
            </p>
          </div>
        )}

        {/* Package details */}
        {pkg && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-gray-900">{pkg.name}</h2>
              {pkg.table_label && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {pkg.table_label}
                </span>
              )}
            </div>
            <div className="space-y-2 text-sm">
              {pkg.vip_sections?.name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{pkg.vip_sections.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4 text-gray-400" />
                <span>Up to {pkg.capacity} guests</span>
              </div>
              {pkg.included_tickets > 0 && (
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckCircle className="w-4 h-4 text-gray-400" />
                  <span>{pkg.included_tickets} admission ticket{pkg.included_tickets !== 1 ? 's' : ''} included</span>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-500">Total paid</span>
              <span className="font-bold text-gray-900">${Number(order.total_price).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Add-on services */}
        {services.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3 text-sm">Add-on Services</h2>
            <div className="space-y-2">
              {services.map(s => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">{s.vip_service_items!.name} ×{s.quantity}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    s.status === 'delivered' ? 'bg-green-100 text-green-700' :
                    s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Guest passes */}
        {order.vip_guest_passes.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-bold text-gray-900 mb-3 text-sm">Guest Passes ({order.vip_guest_passes.length})</h2>
            <div className="space-y-1.5">
              {order.vip_guest_passes.map(g => (
                <div key={g.id} className="flex justify-between items-center text-sm">
                  <span className="text-gray-700">{g.guest_name || 'Guest'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    g.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>{g.status === 'checked_in' ? 'Checked in' : 'Not checked in'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href={`/events/${event}`}
          className="block text-center text-sm text-purple-600 hover:text-purple-800 py-2"
        >
          View event details →
        </Link>
      </div>
    </div>
  )
}
