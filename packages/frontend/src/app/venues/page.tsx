'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import DashboardReturnButton from '@/components/DashboardReturnButton'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(false)
  const [zipCode, setZipCode] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('30')
  const [error, setError] = useState('')
  const [locating, setLocating] = useState(false)
  const [searched, setSearched] = useState(false)

  // Load all venues on mount
  useEffect(() => {
    setLoading(true)
    api.get('/vendors/public')
      .then(res => setVenues(res.data.venues || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const searchVenues = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (zipCode) params.set('zipCode', zipCode)
      if (radiusMiles) params.set('radiusMiles', radiusMiles)
      const res = await api.get(`/vendors/search?${params.toString()}`)
      setVenues(res.data.venues || [])
      setSearched(true)
    } catch {
      setError('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [zipCode, radiusMiles])

  const useMyLocation = useCallback(async () => {
    if (!navigator.geolocation) { setError('Geolocation not supported.'); return }
    setLocating(true)
    setError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const rev = await fetch(`${API_URL}/vendors/geocode/reverse?lat=${latitude}&lng=${longitude}`)
          if (rev.ok) {
            const d = await rev.json()
            if (d?.zip) setZipCode(d.zip)
          }
          setLoading(true)
          const params = new URLSearchParams()
          params.set('lat', String(latitude))
          params.set('lng', String(longitude))
          params.set('radiusMiles', radiusMiles)
          const res = await fetch(`${API_URL}/vendors/search?${params.toString()}`)
          const data = await res.json()
          setVenues(data.venues || [])
          setSearched(true)
        } catch {
          setError('Could not determine your location.')
        } finally {
          setLocating(false)
          setLoading(false)
        }
      },
      () => { setLocating(false); setError('Location access denied. Enter a zip code instead.') },
      { timeout: 10000 },
    )
  }, [radiusMiles])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/lib/LogoEventEcos.png" alt="EventEcos" style={{ height: '40px', width: 'auto' }} />
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/vendors" className="text-sm text-gray-600 hover:text-gray-900 font-medium">Find Vendors</Link>
              <Link href="/signup" className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700">
                List Your Venue
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900 text-sm font-medium">Log In</Link>
              <DashboardReturnButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl font-extrabold mb-4">🏛️ Find Venues</h1>
          <p className="text-blue-200 text-lg mb-8">
            Discover ballrooms, event spaces, and unique venues near you.
          </p>
          <form onSubmit={searchVenues} className="bg-white rounded-xl p-4 shadow-xl">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-1 gap-2">
                <input
                  type="text"
                  placeholder="Zip Code"
                  value={zipCode}
                  onChange={e => setZipCode(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={useMyLocation}
                  disabled={locating || loading}
                  title="Use my location"
                  className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap text-sm"
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
                className="border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="10">Within 10 miles</option>
                <option value="20">Within 20 miles</option>
                <option value="30">Within 30 miles</option>
                <option value="50">Within 50 miles</option>
                <option value="75">Within 75 miles</option>
                <option value="100">Within 100 miles</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
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
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-700">
            {searched ? `${venues.length} venue${venues.length !== 1 ? 's' : ''} found` : `${venues.length} venue${venues.length !== 1 ? 's' : ''} available`}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600" />
          </div>
        ) : venues.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">🏛️</div>
            <p className="text-lg font-medium">No venues found</p>
            <p className="text-sm mt-1">Try searching a different zip code or expanding your radius</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map(venue => (
              <VenueCard key={venue.id} venue={venue} />
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="bg-blue-700 text-white py-12 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2">Own a venue?</h2>
          <p className="text-blue-200 mb-6">List your space and get discovered by event planners and clients.</p>
          <Link href="/signup" className="bg-white text-blue-700 px-8 py-3 rounded-md font-semibold hover:bg-blue-50 inline-block">
            Get Listed Free →
          </Link>
        </div>
      </div>

      <footer className="bg-gray-800 text-gray-400 text-sm py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>&copy; 2026 EventEcos. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

function VenueCard({ venue }: { venue: Venue }) {
  const initials = venue.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <Link href={`/venues/${venue.id}`} className="block group">
      <div className="bg-white rounded-2xl border border-gray-200 group-hover:border-blue-300 group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
        <div className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 rounded-xl border border-gray-100 overflow-hidden flex-shrink-0 bg-blue-50 flex items-center justify-center">
              {venue.profile_image_url ? (
                <img src={venue.profile_image_url} alt={venue.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-blue-400 select-none">{initials || '🏛️'}</span>
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
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              📍 {[venue.address, venue.city, venue.state].filter(Boolean).join(', ')}
              {venue.distance_miles != null && (
                <span className="ml-1 text-blue-600 font-medium">({venue.distance_miles} mi)</span>
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
            <span className="block w-full text-center bg-blue-600 text-white text-sm py-2 rounded-xl font-semibold group-hover:bg-blue-700 transition-colors">
              View Venue →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
