'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import {
  Loader2, Crown, Users, ChevronDown, ChevronUp,
  CheckCircle2, Clock, User, Wine, Phone, Mail, MapPin,
} from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  not_arrived: 'bg-gray-100 text-gray-600',
  partial: 'bg-yellow-100 text-yellow-700',
  checked_in: 'bg-green-100 text-green-700',
}

const SERVICE_STATUS_COLORS: Record<string, string> = {
  ordered: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700',
  preparing: 'bg-yellow-100 text-yellow-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const SERVICE_STATUSES = ['ordered', 'confirmed', 'preparing', 'delivered', 'cancelled']

interface VipOrder {
  id: string
  buyer_name: string | null
  buyer_email: string
  buyer_phone: string | null
  total_price: number
  payment_status: string
  check_in_status: string
  guests_checked_in: number
  concierge_user_id: string | null
  notes: string | null
  qr_code: string
  created_at: string
  vip_packages: {
    name: string
    package_type: string
    capacity: number
    included_tickets: number
    table_label: string | null
  } | null
  vip_guest_passes: { id: string; guest_name: string | null; status: string; checked_in_at: string | null }[]
  vip_service_orders: {
    id: string
    quantity: number
    status: string
    vip_service_items: { name: string; price: number } | null
  }[]
}

export default function VipOrdersPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const [orders, setOrders] = useState<VipOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingService, setUpdatingService] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get(`/vip/events/${eventId}/orders`)
      setOrders(res.data)
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => { load() }, [load])

  const updateServiceOrder = async (serviceOrderId: string, status: string) => {
    setUpdatingService(serviceOrderId)
    try {
      await api.put(`/vip/service-orders/${serviceOrderId}`, { status })
      load()
    } finally {
      setUpdatingService(null)
    }
  }

  const summary = {
    total: orders.length,
    paid: orders.filter(o => o.payment_status === 'paid').length,
    checkedIn: orders.filter(o => o.check_in_status === 'checked_in').length,
    revenue: orders.filter(o => o.payment_status === 'paid').reduce((s, o) => s + Number(o.total_price), 0),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Crown className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">VIP Orders</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/promoter/events/${eventId}/vip`}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Manage Packages
          </Link>
          <Link
            href={`/dashboard/promoter/events/${eventId}/vip/scan`}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
          >
            Door Scanner
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Orders', value: summary.total },
          { label: 'Paid', value: summary.paid },
          { label: 'Checked In', value: summary.checkedIn },
          { label: 'Revenue', value: `$${summary.revenue.toFixed(0)}` },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Crown className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>No VIP orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="font-medium text-gray-900">{order.buyer_name || order.buyer_email}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <Crown className="w-3 h-3" />
                      <span>{order.vip_packages?.name}</span>
                      {order.vip_packages?.table_label && (
                        <>
                          <span>·</span>
                          <MapPin className="w-3 h-3" />
                          <span>{order.vip_packages.table_label}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.check_in_status]}`}>
                    {order.check_in_status === 'not_arrived' ? 'Not Arrived' : order.check_in_status === 'partial' ? `${order.guests_checked_in}/${order.vip_packages?.capacity} In` : 'Checked In'}
                  </span>
                  <span className="text-sm font-semibold text-gray-700">${Number(order.total_price).toFixed(0)}</span>
                  {expandedId === order.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {expandedId === order.id && (
                <div className="border-t border-gray-100 p-4 space-y-4 bg-gray-50">
                  {/* Contact */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{order.buyer_email}</span>
                    {order.buyer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{order.buyer_phone}</span>}
                  </div>

                  {/* Package details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Package</div>
                      <div className="font-medium">{order.vip_packages?.name}</div>
                      {(order.vip_packages?.included_tickets ?? 0) > 0 && (
                        <div className="text-gray-500 text-xs mt-0.5">{order.vip_packages?.included_tickets} admission passes included</div>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Check-In</div>
                      <div className="font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        {order.guests_checked_in} of {order.vip_packages?.capacity ?? '?'} guests
                      </div>
                    </div>
                  </div>

                  {/* Guest passes */}
                  {order.vip_guest_passes.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Guest Passes</div>
                      <div className="flex flex-wrap gap-2">
                        {order.vip_guest_passes.map(pass => (
                          <div key={pass.id} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${pass.status === 'used' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {pass.status === 'used' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                            {pass.guest_name || 'Guest'}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service orders */}
                  {order.vip_service_orders.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Service Items</div>
                      <div className="space-y-2">
                        {order.vip_service_orders.map(so => (
                          <div key={so.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Wine className="w-4 h-4 text-purple-400" />
                              <span className="text-sm font-medium">{so.vip_service_items?.name}</span>
                              <span className="text-xs text-gray-400">×{so.quantity}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SERVICE_STATUS_COLORS[so.status] || 'bg-gray-100 text-gray-600'}`}>
                                {so.status}
                              </span>
                              <select
                                value={so.status}
                                disabled={updatingService === so.id}
                                onChange={e => updateServiceOrder(so.id, e.target.value)}
                                className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
                              >
                                {SERVICE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {order.notes && (
                    <div className="text-sm text-gray-600 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                      <span className="font-medium">Notes: </span>{order.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
