'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Crown, MapPin, Users, Loader2, CheckCircle, Calendar } from 'lucide-react'
import api from '@/lib/api'

interface GuestPass {
  id: string
  guest_name: string | null
  guest_email: string | null
  qr_code: string
  status: string
  checked_in_at: string | null
  vip_orders: {
    id: string
    public_event_id: string
    buyer_name: string | null
    vip_packages: {
      name: string
      package_type: string
      capacity: number
      table_label: string | null
      vip_sections: { name: string } | null
    } | null
    public_events: {
      title: string
      event_date: string | null
      start_time: string | null
      venue_name: string | null
    } | null
  }
}

function fmtDate(d: string | null) {
  if (!d) return 'TBD'
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

export default function GuestPassPage({ params }: { params: { qrCode: string } }) {
  const { qrCode } = params
  const [pass, setPass] = useState<GuestPass | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!qrCode) return
    api.get(`/vip/public/passes/${encodeURIComponent(qrCode)}`)
      .then(r => { setPass(r.data); setLoading(false) })
      .catch(e => { setError(e.response?.data?.message || 'Pass not found'); setLoading(false) })
  }, [qrCode])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !pass) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4 px-4">
        <Crown className="w-12 h-12 text-gray-300" />
        <p className="text-gray-600 text-center">{error || 'Guest pass not found'}</p>
      </div>
    )
  }

  const event   = pass.vip_orders?.public_events
  const pkg     = pass.vip_orders?.vip_packages
  const isUsed  = pass.status === 'used' || pass.status === 'checked_in'

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-amber-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-sm mx-auto px-4 h-14 flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-gray-900 text-sm">VIP Guest Pass</span>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-8 space-y-5">

        {/* Event + guest name */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 text-center">
          {isUsed ? (
            <>
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h1 className="text-lg font-bold text-gray-500">Already Checked In</h1>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-3">
                <Crown className="w-8 h-8 text-purple-600" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">
                {pass.guest_name ? `Welcome, ${pass.guest_name}!` : 'Your VIP Pass'}
              </h1>
            </>
          )}
          {event?.title && (
            <p className="text-gray-500 text-sm mt-1">{event.title}</p>
          )}
          {event?.event_date && (
            <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
              <Calendar className="w-3 h-3" />
              {fmtDate(event.event_date)}
              {event.start_time && ` · ${event.start_time}`}
            </p>
          )}
        </div>

        {/* QR Code */}
        {!isUsed && (
          <div className="bg-white rounded-2xl border-2 border-dashed border-amber-300 shadow-sm p-6 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-4 font-medium">Show at VIP Entrance</p>
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-inner">
                <QRCodeSVG value={pass.qr_code} size={200} level="H" includeMargin />
              </div>
            </div>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
              🔒 This is your individual pass. Do not share it.
            </p>
          </div>
        )}

        {/* Package info */}
        {pkg && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-gray-900 text-sm">{pkg.name}</span>
              {pkg.table_label && (
                <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  {pkg.table_label}
                </span>
              )}
            </div>
            <div className="space-y-1.5 text-sm text-gray-600">
              {pkg.vip_sections?.name && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{pkg.vip_sections.name}</span>
                </div>
              )}
              {event?.venue_name && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  <span>{event.venue_name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <span>Table capacity: {pkg.capacity} guests</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
