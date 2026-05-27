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
  { value: 'graphic_designer', label: 'Graphic Designer' },
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
  graphic_designer: '🖌️',
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
  graphic_designer: 'bg-teal-100 text-teal-700',
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
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white border-b-4 border-primary-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/">
              <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" style={{ height: '70px', width: 'auto' }} />
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/venues" className="text-gray-700 hover:text-primary-600 font-medium text-sm border border-gray-300 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors hidden md:inline-flex">
                Find Venues
              </Link>
              <Link href="/events" className="text-gray-700 hover:text-primary-600 font-medium text-sm border border-gray-300 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors hidden md:inline-flex">
                Discover Events
              </Link>
              <Link href="/login" className="text-gray-700 hover:text-primary-600 font-medium text-sm border border-gray-300 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors">
                Login
              </Link>
              <Link href="/signup" className="bg-accent-500 hover:bg-accent-600 text-white font-semibold px-5 py-1.5 rounded-lg transition-colors text-sm whitespace-nowrap">
                Get Started
              </Link>
              <DashboardReturnButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Banner */}
      <div className="relative w-full h-56 md:h-72 overflow-hidden">
        <img src="/lib/Vendors-Banner.jpg" alt="Discover Vendors" className="w-full h-full object-cover" />
      </div>

      {/* Search */}
      <div className="bg-gradient-to-br from-primary-700 to-primary-900 text-white py-8">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-primary-200 text-lg mb-6">
            Discover DJs, photographers, decorators, planners, and more near you.
          </p>

          {/* Search Bar */}
          <form onSubmit={searchDirectory} className="bg-white rounded-xl p-4 shadow-xl">
            <div className="flex justify-center mb-3">
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating || loading}
                className="px-4 py-2 border border-primary-300 rounded-lg text-primary-600 hover:bg-primary-50 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                {locating ? 'Locating...' : '📍 Use My Location'}
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-1 gap-2">
                <input
                  type="text"
                  placeholder="Zip Code"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
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
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <Link href="/">
                <div className="inline-block bg-white rounded-xl p-2">
                  <img src="/lib/EventEcos-Logo.jpg" alt="EventEcos" style={{ height: '90px', width: 'auto' }} />
                </div>
              </Link>
              <p className="text-gray-400 text-sm mt-2">The complete event management platform.</p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Browse</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/venues" className="hover:text-white">Venues</Link></li>
                <li><Link href="/vendors" className="hover:text-white">Vendors</Link></li>
                <li><Link href="/events" className="hover:text-white">Events</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><Link href="/privacy-policy" className="hover:text-white">Privacy</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-white">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8">
            <p className="text-center text-gray-400 text-sm">&copy; 2026 EventEcos. All rights reserved. Powering the Event Ecosystem.</p>
          </div>
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
