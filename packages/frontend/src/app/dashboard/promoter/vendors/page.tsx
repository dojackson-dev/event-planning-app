'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Search, Store, Loader2, MapPin, Star, DollarSign } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  dj: '🎧 DJ',
  decorator: '🌸 Decorator',
  planner_coordinator: '📋 Planner / Coordinator',
  furniture: '🪑 Furniture',
  photographer: '📸 Photographer',
  musicians: '🎵 Musicians',
  mc_host: '🎙️ MC / Host',
  graphic_designer: '🎨 Graphic Designer',
  other: '⭐ Other',
}

interface Vendor {
  id: string
  business_name: string
  category: string
  bio: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  profile_image_url: string | null
  hourly_rate: number | null
  flat_rate: number | null
  rate_description: string | null
  is_verified: boolean
  avg_rating?: number
}

export default function PromoterBrowseVendorsPage() {
  const router = useRouter()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (zipCode) params.set('zipCode', zipCode)
      const res = await api.get(`/vendors/search?${params}`)
      setVendors(res.data?.vendors || [])
    } catch {
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = vendors.filter(v =>
    !search || v.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (v.bio || '').toLowerCase().includes(search.toLowerCase())
  )

  const rateLabel = (v: Vendor) => {
    if (v.rate_description) return v.rate_description
    if (v.flat_rate) return `$${v.flat_rate.toLocaleString()} flat`
    if (v.hourly_rate) return `$${v.hourly_rate}/hr`
    return null
  }

  return (
    <div className="bg-gray-50">
      {/* Page Title Banner */}
      <div className="bg-gradient-to-r from-purple-700 to-purple-500 px-4 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Browse Vendors</h1>
          <button
            onClick={() => router.push('/dashboard/promoter/vendors/bookings')}
            className="px-4 py-2 bg-white text-purple-700 rounded-lg text-sm font-semibold hover:bg-purple-50"
          >
            My Vendor Bookings
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Zip Code</label>
            <input
              value={zipCode}
              onChange={e => setZipCode(e.target.value)}
              placeholder="e.g. 30301"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex-1 min-w-40">
            <label className="block text-xs font-medium text-gray-600 mb-1">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Business name..."
                className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Search className="w-4 h-4" /> Search
          </button>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No vendors found</h3>
            <p className="text-sm text-gray-500">Try adjusting your filters or zip code</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(vendor => (
              <button
                key={vendor.id}
                onClick={() => router.push(`/dashboard/promoter/vendors/${vendor.id}`)}
                className="text-left bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-purple-200 transition-all group"
              >
                <div className="h-28 bg-purple-50 flex items-center justify-center overflow-hidden">
                  {vendor.profile_image_url ? (
                    <img src={vendor.profile_image_url} alt={vendor.business_name} className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-10 h-10 text-purple-300" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm group-hover:text-purple-700 truncate">{vendor.business_name}</h3>
                    {vendor.is_verified && (
                      <span className="shrink-0 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">✓ Verified</span>
                    )}
                  </div>
                  <p className="text-xs text-purple-600 font-medium mb-2">{CATEGORY_LABELS[vendor.category] ?? vendor.category}</p>
                  {(vendor.city || vendor.state) && (
                    <p className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                      <MapPin className="w-3 h-3" />{[vendor.city, vendor.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {rateLabel(vendor) && (
                    <p className="flex items-center gap-1 text-xs text-green-700 font-medium">
                      <DollarSign className="w-3 h-3" />{rateLabel(vendor)}
                    </p>
                  )}
                  {vendor.avg_rating != null && vendor.avg_rating > 0 && (
                    <p className="flex items-center gap-1 text-xs text-amber-600 mt-1">
                      <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" />{vendor.avg_rating.toFixed(1)}
                    </p>
                  )}
                  {vendor.bio && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">{vendor.bio}</p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
