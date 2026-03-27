'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import api from '@/lib/api'
import DashboardReturnButton from '@/components/DashboardReturnButton'

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'dj', label: 'DJ' },
  { value: 'decorator', label: 'Decorator' },
  { value: 'planner_coordinator', label: 'Planner / Coordinator' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'musicians', label: 'Musicians' },
  { value: 'mc_host', label: 'MC / Host' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_ICONS: Record<string, string> = {
  dj: '🎧',
  decorator: '🎨',
  planner_coordinator: '📋',
  furniture: '🪑',
  photographer: '📷',
  musicians: '🎵',
  mc_host: '🎤',
  other: '⭐',
}

const CATEGORY_COLORS: Record<string, string> = {
  dj: 'bg-purple-100 text-purple-700',
  decorator: 'bg-pink-100 text-pink-700',
  planner_coordinator: 'bg-blue-100 text-blue-700',
  furniture: 'bg-amber-100 text-amber-700',
  photographer: 'bg-green-100 text-green-700',
  musicians: 'bg-indigo-100 text-indigo-700',
  mc_host: 'bg-red-100 text-red-700',
  other: 'bg-gray-100 text-gray-700',
}

interface Vendor {
  id: string
  business_name: string
  category: string
  bio: string
  city: string
  state: string
  zip_code: string
  hourly_rate: number
  flat_rate: number
  rate_description: string
  profile_image_url: string
  website: string
  instagram: string
  phone: string
  email: string
  is_verified: boolean
  distance_miles?: number
  avgRating?: number
  reviewCount?: number
}

interface Venue {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  capacity: number
  profile_image_url: string
  description: string
  website: string
  phone: string
  email?: string
  distance_miles?: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const [zipCode, setZipCode] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('30')
  const [category, setCategory] = useState('')
  const [activeTab, setActiveTab] = useState<'vendors' | 'venues'>('vendors')

  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)

  const useMyLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(`${API_URL}/vendors/geocode/reverse?lat=${latitude}&lng=${longitude}`)
          if (res.ok) {
            const data = await res.json()
            if (data?.zip) {
              setZipCode(data.zip)
              // Trigger search with the resolved lat/lng directly
              setLoading(true)
              const params = new URLSearchParams()
              params.set('lat', String(latitude))
              params.set('lng', String(longitude))
              params.set('radiusMiles', radiusMiles)
              if (category) params.set('category', category)
              const searchRes = await fetch(`${API_URL}/vendors/search?${params.toString()}`)
              const searchData = await searchRes.json()
              setVendors(searchData.vendors || [])
              setVenues(searchData.venues || [])
              setSearched(true)
            }
          }
        } catch {
          setError('Could not determine your location. Try entering a zip code.')
        } finally {
          setLocating(false)
          setLoading(false)
        }
      },
      () => {
        setLocating(false)
        setError('Location access denied. Please enter a zip code instead.')
      },
      { timeout: 10000 }
    )
  }, [radiusMiles, category])

  const searchDirectory = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (zipCode) params.set('zipCode', zipCode)
      if (radiusMiles) params.set('radiusMiles', radiusMiles)
      if (category) params.set('category', category)

      const res = await api.get(`/vendors/search?${params.toString()}`)
      const data = res.data

      if (data.vendors !== undefined) {
        setVendors(data.vendors || [])
        setVenues(data.venues || [])
      } else {
        // Fallback: all vendors (no geo)
        setVendors(Array.isArray(data) ? data : [])
        setVenues([])
      }
      setSearched(true)
    } catch (err: any) {
      setError('Search failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [zipCode, radiusMiles, category])

  // Load all vendors + venues on mount
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true)
      try {
        const res = await api.get('/vendors/public')
        setVendors(res.data.vendors || [])
        setVenues(res.data.venues || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  const filteredVendors = category
    ? vendors.filter(v => v.category === category)
    : vendors

  const renderStars = (rating?: number, reviewCount?: number) => {
    if (!rating) return null
    return (
      <span className="flex items-center gap-1 text-sm text-amber-500">
        {'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}
        <span className="text-gray-500 text-xs">({rating.toFixed(1)}{reviewCount ? ` · ${reviewCount} review${reviewCount !== 1 ? 's' : ''}` : ''})</span>
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/lib/LogoDVS.png" alt="DoVenueSuite" style={{ height: '40px', width: 'auto' }} />
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/signup" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700">
                List Your Business
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Log In
              </Link>
              <DashboardReturnButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-extrabold mb-4">Find Vendors &amp; Venues</h1>
          <p className="text-primary-200 text-lg mb-8">
            Discover DJs, photographers, decorators, planners, and more near you.
          </p>

          {/* Search Bar */}
          <form onSubmit={searchDirectory} className="bg-white rounded-xl p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-1 gap-2">
                <input
                  type="text"
                  placeholder="Zip Code"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating || loading}
                  title="Use my current location"
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-primary-400 hover:text-primary-600 disabled:opacity-50 transition-colors whitespace-nowrap text-sm"
                >
                  {locating ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  )}
                  <span className="hidden sm:inline">{locating ? 'Locating...' : 'Near Me'}</span>
                </button>
              </div>
              <select
                value={radiusMiles}
                onChange={e => setRadiusMiles(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="10">Within 10 miles</option>
                <option value="20">Within 20 miles</option>
                <option value="30">Within 30 miles</option>
                <option value="50">Within 50 miles</option>
                <option value="75">Within 75 miles</option>
                <option value="100">Within 100 miles</option>
              </select>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <button
                type="submit"
                disabled={loading}
                className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? 'Searching...' : '🔍 Search'}
              </button>
            </div>
            {error && <p className="text-red-600 text-sm mt-2 text-left">{error}</p>}
          </form>
        </div>
      </div>

      {/* Category pills */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  category === c.value
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'
                }`}
              >
                {c.value && CATEGORY_ICONS[c.value]} {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Tabs */}
        <div className="flex border-b mb-6 gap-1">
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-colors ${
              activeTab === 'vendors'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🎪 Vendors ({filteredVendors.length})
          </button>
          <button
            onClick={() => setActiveTab('venues')}
            className={`px-6 py-3 font-semibold text-sm rounded-t-lg transition-colors ${
              activeTab === 'venues'
                ? 'border-b-2 border-primary-600 text-primary-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            🏛️ Venues ({venues.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
          </div>
        ) : (
          <>
            {/* VENDORS TAB */}
            {activeTab === 'vendors' && (
              <>
                {filteredVendors.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <div className="text-5xl mb-4">🔍</div>
                    <p className="text-lg font-medium">No vendors found</p>
                    <p className="text-sm mt-1">Try searching a different zip code or expanding your radius</p>
                    <Link href="/signup" className="mt-4 inline-block bg-primary-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-primary-700">
                      Be the first vendor in your area
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredVendors.map(vendor => (
                      <VendorCard key={vendor.id} vendor={vendor} renderStars={renderStars} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* VENUES TAB */}
            {activeTab === 'venues' && (
              <>
                {venues.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <div className="text-5xl mb-4">🏛️</div>
                    <p className="text-lg font-medium">No venues found</p>
                    <p className="text-sm mt-1">Search a zip code to find venues near you</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {venues.map(venue => (
                      <VenueCard key={venue.id} venue={venue} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* CTA Banner */}
      <div className="bg-primary-700 text-white py-12 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2">Are you a vendor or venue owner?</h2>
          <p className="text-primary-200 mb-6">List your business for free and get discovered by event planners and owners.</p>
          <Link
            href="/signup"
            className="bg-white text-primary-700 px-8 py-3 rounded-md font-semibold hover:bg-primary-50 inline-block"
          >
            Get Listed Free →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 text-sm py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2026 DoVenueSuite. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function VendorCard({ vendor, renderStars }: { vendor: Vendor; renderStars: (r?: number, rc?: number) => React.ReactNode }) {
  const catColor = CATEGORY_COLORS[vendor.category] || 'bg-gray-100 text-gray-700'
  const catLabel = CATEGORIES.find(c => c.value === vendor.category)?.label || vendor.category
  const catIcon = CATEGORY_ICONS[vendor.category] || '⭐'
  const initials = vendor.business_name
    .split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      <div className="p-5">
        {/* Top row: logo + name + category */}
        <div className="flex items-start gap-4 mb-4">
          {/* Logo square */}
          <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
            {vendor.profile_image_url ? (
              <img src={vendor.profile_image_url} alt={vendor.business_name} className="w-full h-full object-contain" />
            ) : (
              <span className="text-xl font-bold text-gray-400 select-none">{initials || catIcon}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">{vendor.business_name}</h3>
              {vendor.is_verified && (
                <span className="flex-shrink-0 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">✓ Verified</span>
              )}
            </div>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${catColor}`}>
              {catIcon} {catLabel}
            </span>
          </div>
        </div>

        {/* Stars */}
        {renderStars(vendor.avgRating, vendor.reviewCount)}

        {/* Location */}
        {(vendor.city || vendor.state) && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            📍 {[vendor.city, vendor.state].filter(Boolean).join(', ')}
            {vendor.distance_miles != null && (
              <span className="ml-1 text-primary-600 font-medium">({vendor.distance_miles} mi)</span>
            )}
          </p>
        )}

        {/* Bio */}
        {vendor.bio && (
          <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{vendor.bio}</p>
        )}

        {/* Pricing */}
        {(vendor.hourly_rate || vendor.flat_rate) && (
          <p className="text-sm font-semibold text-gray-700 mt-2">
            {vendor.hourly_rate ? `$${vendor.hourly_rate}/hr` : ''}
            {vendor.hourly_rate && vendor.flat_rate ? ' · ' : ''}
            {vendor.flat_rate ? `$${vendor.flat_rate} flat` : ''}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-2">
          <Link
            href={`/vendors/${vendor.id}`}
            className="flex-1 text-center bg-primary-600 text-white text-sm py-2 rounded-xl hover:bg-primary-700 font-semibold transition-colors"
          >
            View Profile
          </Link>
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone}`}
              className="px-3 py-2 border border-gray-200 rounded-xl text-gray-500 text-sm hover:bg-gray-50 transition-colors"
              title="Call"
            >
              📞
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function VenueCard({ venue }: { venue: Venue }) {
  const initials = venue.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <Link href={`/venues/${venue.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-200 group-hover:border-primary-300 group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
              {venue.profile_image_url ? (
                <img src={venue.profile_image_url} alt={venue.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-xl font-bold text-gray-400 select-none">{initials || '🏛️'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2 mb-1.5">{venue.name}</h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                🏛️ Venue
              </span>
            </div>
          </div>

          {(venue.city || venue.state) && (
            <p className="text-xs text-gray-500 mt-1">
              📍 {[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
              {venue.distance_miles != null && (
                <span className="ml-1 text-primary-600 font-medium">({venue.distance_miles} mi)</span>
              )}
            </p>
          )}
          {venue.capacity && (
            <p className="text-xs text-gray-500 mt-0.5">👥 Up to {venue.capacity.toLocaleString()} guests</p>
          )}
          {venue.description && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{venue.description}</p>
          )}

          <div className="mt-4">
            <span className="block w-full text-center bg-primary-600 text-white text-sm py-2 rounded-xl font-semibold group-hover:bg-primary-700 transition-colors">
              View Venue →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
