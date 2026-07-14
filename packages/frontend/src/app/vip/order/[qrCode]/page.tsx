'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import Link from 'next/link'
import { Crown, Calendar, MapPin, Loader2, CheckCircle, Clock, Users, Send, X, Phone, Mail, UserPlus } from 'lucide-react'
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
  vip_guest_passes: { id: string; guest_name: string | null; guest_email: string | null; guest_phone: string | null; qr_code: string; status: string }[]
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
  const [showForward, setShowForward] = useState(false)
  const [forwardEmail, setForwardEmail] = useState('')
  const [forwardName, setForwardName] = useState('')
  const [forwardLoading, setForwardLoading] = useState(false)
  const [forwardDone, setForwardDone] = useState(false)
  const [forwardError, setForwardError] = useState('')
  // Guest pass assignment: index → { name, phone, email }
  const [passAssign, setPassAssign] = useState<Record<number, { name: string; phone: string; email: string }>>({}) 
  const [passSent, setPassSent] = useState<Record<number, 'sending' | 'sent' | 'error'>>({}) 
  const [passExpanded, setPassExpanded] = useState<number | null>(null)

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

  const sendGuestPass = async (idx: number) => {
    const form = passAssign[idx] || { name: '', phone: '', email: '' }
    if (!form.phone && !form.email) return
    setPassSent(prev => ({ ...prev, [idx]: 'sending' }))
    try {
      await api.post(`/vip/public/orders/qr/${encodeURIComponent(qrCode)}/passes/assign`, {
        assignments: [{ pass_index: idx, guest_name: form.name || undefined, guest_phone: form.phone || undefined, guest_email: form.email || undefined }],
      })
      setPassSent(prev => ({ ...prev, [idx]: 'sent' }))
      setPassExpanded(null)
    } catch {
      setPassSent(prev => ({ ...prev, [idx]: 'error' }))
    }
  }

  const handleForward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forwardEmail) return
    setForwardLoading(true)
    setForwardError('')
    try {
      await api.post(`/vip/public/orders/qr/${encodeURIComponent(qrCode)}/transfer`, {
        recipient_email: forwardEmail,
        recipient_name:  forwardName || undefined,
      })
      setForwardDone(true)
      setOrder(prev => prev ? { ...prev, buyer_email: forwardEmail, buyer_name: forwardName || null } : prev)
    } catch (err: any) {
      setForwardError(err.response?.data?.message || 'Transfer failed. Please try again.')
    } finally {
      setForwardLoading(false)
    }
  }

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
    <>
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

        {/* Guest passes — individual ticket assignment */}
        {order.vip_guest_passes.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <UserPlus className="w-4 h-4 text-purple-500" />
              <h2 className="font-bold text-gray-900 text-sm">Guest Passes ({order.vip_guest_passes.length})</h2>
              <span className="ml-auto text-xs text-gray-400">Tap a slot to send a ticket</span>
            </div>
            <div className="space-y-2">
              {order.vip_guest_passes.map((g, idx) => {
                const form   = passAssign[idx] || { name: '', phone: '', email: '' }
                const status = passSent[idx]
                const isOpen = passExpanded === idx
                const used   = g.status === 'used' || g.status === 'checked_in'
                return (
                  <div key={g.id} className={`border rounded-xl overflow-hidden ${used ? 'border-gray-100 bg-gray-50' : 'border-purple-100 bg-purple-50/30'}`}>
                    <button
                      disabled={used}
                      onClick={() => setPassExpanded(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm"
                    >
                      <span className={`font-medium ${used ? 'text-gray-400' : 'text-gray-800'}`}>
                        {g.guest_name || `Pass ${idx + 1}`}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        used            ? 'bg-green-100 text-green-700' :
                        status === 'sent'  ? 'bg-blue-100 text-blue-700' :
                        status === 'error' ? 'bg-red-100 text-red-600' :
                        g.guest_phone || g.guest_email ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {used ? 'Checked in' : status === 'sent' ? '✓ Sent' : status === 'error' ? 'Failed' : (g.guest_phone || g.guest_email) ? 'Assigned' : 'Unassigned'}
                      </span>
                    </button>

                    {isOpen && !used && (
                      <div className="px-4 pb-4 space-y-2 border-t border-purple-100 pt-3">
                        <input
                          value={form.name}
                          onChange={e => setPassAssign(p => ({ ...p, [idx]: { ...form, name: e.target.value } }))}
                          placeholder="Guest name (optional)"
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                        />
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={e => setPassAssign(p => ({ ...p, [idx]: { ...form, phone: e.target.value } }))}
                            placeholder="+1 555 000 0000 (SMS — preferred)"
                            className="w-full pl-8 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input
                            type="email"
                            value={form.email}
                            onChange={e => setPassAssign(p => ({ ...p, [idx]: { ...form, email: e.target.value } }))}
                            placeholder="Email (optional)"
                            className="w-full pl-8 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                          />
                        </div>
                        <button
                          onClick={() => sendGuestPass(idx)}
                          disabled={(!form.phone && !form.email) || status === 'sending'}
                          className="w-full py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {status === 'sending'
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                            : <><Send className="w-4 h-4" /> Send Pass</>}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Forward Ticket */}
        {order.check_in_status !== 'checked_in' && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 text-sm">Forward this ticket</p>
                <p className="text-xs text-gray-400 mt-0.5">Transfer your VIP access to someone else</p>
              </div>
              <button
                onClick={() => { setShowForward(true); setForwardDone(false); setForwardError('') }}
                className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"
              >
                <Send className="w-4 h-4" /> Forward
              </button>
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

    {/* Forward Ticket Modal */}
    {showForward && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 px-4">
        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">Forward VIP Ticket</h2>
            <button onClick={() => setShowForward(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          {forwardDone ? (
            <div className="text-center py-6">
              <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">Ticket Forwarded!</p>
              <p className="text-sm text-gray-500 mt-1">A confirmation with the QR code was sent to {forwardEmail}.</p>
              <button
                onClick={() => setShowForward(false)}
                className="mt-5 w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleForward} className="space-y-4">
              <p className="text-sm text-gray-500">
                The recipient will receive an email with the QR code and event details.
                <span className="block mt-1 text-amber-600 text-xs">Note: this action cannot be undone — you will lose access to this ticket.</span>
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Email *</label>
                <input
                  type="email"
                  required
                  value={forwardEmail}
                  onChange={e => setForwardEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Name (optional)</label>
                <input
                  type="text"
                  value={forwardName}
                  onChange={e => setForwardName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {forwardError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{forwardError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForward(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forwardLoading || !forwardEmail}
                  className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {forwardLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {forwardLoading ? 'Sending…' : 'Forward Ticket'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
    </>
  )
}
