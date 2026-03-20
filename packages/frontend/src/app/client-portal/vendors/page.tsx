'use client'

import { useState, useEffect } from 'react'
import clientApi from '@/lib/clientApi'
import {
  Store,
  Phone,
  Mail,
  Globe,
  Instagram,
  CheckCircle2,
  AlertCircle,
  MapPin,
  DollarSign,
} from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  dj:                   '🎧 DJ',
  decorator:            '🎨 Decorator',
  planner_coordinator:  '📋 Planner / Coordinator',
  furniture:            '🪑 Furniture',
  photographer:         '📷 Photographer',
  musicians:            '🎵 Musicians',
  mc_host:              '🎤 MC / Host',
  other:                '⭐ Other',
}

const bookingStatusColor: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-700 border-green-200',
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  declined:  'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  completed: 'bg-blue-100 text-blue-700 border-blue-200',
}

export default function ClientVendorsPage() {
  const [vendorBookings, setVendorBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    clientApi.get('/vendors')
      .then((res) => setVendorBookings(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading vendors...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="h-6 w-6 text-primary-600" />
          Booked Vendors
        </h1>
        <span className="text-sm text-gray-500">{vendorBookings.length} vendor{vendorBookings.length !== 1 ? 's' : ''}</span>
      </div>

      {vendorBookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No vendors booked yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vendorBookings.map((vb: any) => {
            const v = vb.vendor
            return (
              <div key={vb.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    {v?.profile_image_url ? (
                      <img
                        src={v.profile_image_url}
                        alt={v.business_name}
                        className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <Store className="h-7 w-7 text-primary-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate">{v?.business_name ?? 'Vendor'}</h3>
                        {v?.is_verified && (
                          <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" aria-label="Verified" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{CATEGORY_LABELS[v?.category] ?? v?.category}</p>
                      {(v?.city || v?.state) && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {[v.city, v.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${bookingStatusColor[vb.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      {vb.status}
                    </span>
                  </div>

                  {/* Bio */}
                  {v?.bio && (
                    <p className="mt-3 text-sm text-gray-600 line-clamp-2">{v.bio}</p>
                  )}

                  {/* Booking Details */}
                  <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 text-sm">
                    {vb.agreed_amount != null && (
                      <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1"><DollarSign className="h-3 w-3" />Agreed Amount</p>
                        <p className="font-semibold text-gray-900">${Number(vb.agreed_amount).toFixed(2)}</p>
                      </div>
                    )}
                    {vb.deposit_amount != null && (
                      <div>
                        <p className="text-xs text-gray-500">Deposit</p>
                        <p className="font-semibold text-gray-900">${Number(vb.deposit_amount).toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  {/* Contact */}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    {v?.phone && (
                      <a href={`tel:${v.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                        <Phone className="h-3.5 w-3.5" />{v.phone}
                      </a>
                    )}
                    {v?.email && (
                      <a href={`mailto:${v.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                        <Mail className="h-3.5 w-3.5" />{v.email}
                      </a>
                    )}
                    {v?.website && (
                      <a href={v.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                        <Globe className="h-3.5 w-3.5" />Website
                      </a>
                    )}
                    {v?.instagram && (
                      <a href={`https://instagram.com/${v.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600">
                        <Instagram className="h-3.5 w-3.5" />{v.instagram}
                      </a>
                    )}
                  </div>

                  {/* Notes */}
                  {vb.notes && (
                    <p className="mt-3 text-xs text-gray-400 italic">"{vb.notes}"</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
