'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import {
  Search,
  MapPin,
  Music,
  DollarSign,
  ExternalLink,
  Instagram,
  Globe,
  ChevronRight,
  Mic2,
  Filter,
} from 'lucide-react'

const ARTIST_TYPES = [
  { value: '', label: 'All Types', icon: '🎭' },
  { value: 'musician', label: 'Musician / Band', icon: '🎵' },
  { value: 'dj', label: 'DJ', icon: '🎧' },
  { value: 'comedian', label: 'Comedian', icon: '🎤' },
  { value: 'dancer', label: 'Dancer', icon: '💃' },
  { value: 'magician', label: 'Magician', icon: '🎩' },
  { value: 'spoken_word', label: 'Spoken Word', icon: '📖' },
  { value: 'mc_host', label: 'MC / Host', icon: '🎙️' },
  { value: 'other', label: 'Other', icon: '⭐' },
]

const TRAVEL_SCOPES = [
  { value: '', label: 'Any Range', icon: '📍' },
  { value: 'Local', label: 'Local', icon: '🏠' },
  { value: 'Regional', label: 'Regional+', icon: '🗺️' },
  { value: 'National', label: 'National+', icon: '✈️' },
  { value: 'International', label: 'International', icon: '🌍' },
]

interface Artist {
  id: string
  artist_name: string
  stage_name: string | null
  artist_type: string
  genres: string[]
  location: string | null
  profile_image_url: string | null
  performance_fee_min: number | null
  performance_fee_max: number | null
  travel_availability: string | null
  description: string | null
  instagram: string | null
  available_for_booking: boolean
}

export default function ArtistDirectoryPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [searchLocation, setSearchLocation] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [travelScope, setTravelScope] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)

  const fetchArtists = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (selectedType) params.artistType = selectedType
      if (searchLocation) params.location = searchLocation
      if (availableOnly) params.availableForBooking = 'true'
      if (travelScope) params.travelAvailability = travelScope

      const res = await api.get('/artists/search', { params })
      setArtists(res.data)
    } catch (err) {
      console.error('Failed to fetch artists:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedType, searchLocation, availableOnly, travelScope])

  useEffect(() => {
    fetchArtists()
  }, [fetchArtists])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchArtists()
  }

  const formatFeeRange = (min: number | null, max: number | null) => {
    if (!min && !max) return null
    if (min && max) return `$${min.toLocaleString()} – $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
    return null
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mic2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Artist Directory</h1>
            <p className="text-sm text-gray-500">Discover and book talent for your events</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchLocation}
              onChange={(e) => setSearchLocation(e.target.value)}
              placeholder="Search by city or region..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {/* Type filter chips */}
        <div className="flex flex-wrap gap-2">
          {ARTIST_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedType === type.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>

        {/* Travel scope filter */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-gray-500 mr-1">Travel range:</span>
          {TRAVEL_SCOPES.map((scope) => (
            <button
              key={scope.value}
              onClick={() => setTravelScope(scope.value)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                travelScope === scope.value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{scope.icon}</span>
              {scope.label}
            </button>
          ))}
        </div>

        {/* Available filter */}
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={availableOnly}
            onChange={(e) => setAvailableOnly(e.target.checked)}
            className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">Available for booking only</span>
        </label>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : artists.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-lg">
          <Mic2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No artists found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist) => {
            const typeInfo = ARTIST_TYPES.find(t => t.value === artist.artist_type) || ARTIST_TYPES[ARTIST_TYPES.length - 1]
            const feeRange = formatFeeRange(artist.performance_fee_min, artist.performance_fee_max)

            return (
              <div
                key={artist.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                {/* Artist header */}
                <div className="flex items-center gap-3 mb-3">
                  {artist.profile_image_url ? (
                    <img
                      src={artist.profile_image_url}
                      alt={artist.artist_name}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">
                      {typeInfo.icon}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {artist.stage_name || artist.artist_name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {typeInfo.label}
                      {artist.genres?.length > 0 && ` · ${artist.genres.slice(0, 2).join(', ')}`}
                    </p>
                  </div>
                  {!artist.available_for_booking && (
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 flex-shrink-0">
                      Unavailable
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-3">
                  {artist.location && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="h-3.5 w-3.5" />
                      {artist.location}
                    </div>
                  )}
                  {feeRange && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <DollarSign className="h-3.5 w-3.5" />
                      {feeRange}
                    </div>
                  )}
                  {artist.travel_availability && (
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-medium ${
                        artist.travel_availability === 'Local only'
                          ? 'bg-gray-100 text-gray-600'
                          : artist.travel_availability === 'Regional (within 200 miles)'
                          ? 'bg-blue-50 text-blue-700'
                          : artist.travel_availability === 'National'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-green-50 text-green-700'
                      }`}>
                        {artist.travel_availability === 'Regional (within 200 miles)' ? 'Regional' : artist.travel_availability}
                      </span>
                    </div>
                  )}
                </div>

                {artist.description && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-3">{artist.description}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    {artist.instagram && (
                      <a
                        href={`https://instagram.com/${artist.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-pink-500"
                      >
                        <Instagram className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/artists/${artist.id}`}
                    className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    View profile <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
