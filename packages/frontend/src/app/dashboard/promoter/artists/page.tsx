'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Search, Mic2, Loader2, MapPin, Music } from 'lucide-react'

const ARTIST_TYPES: Record<string, string> = {
  musician: '🎵 Musician',
  dj: '🎧 DJ',
  comedian: '🎤 Comedian',
  dancer: '💃 Dancer',
  magician: '🎩 Magician',
  spoken_word: '📖 Spoken Word',
  mc_host: '🎙️ MC / Host',
  other: '⭐ Other',
}

interface Artist {
  id: string
  artist_name: string
  stage_name: string | null
  artist_type: string
  location: string | null
  genres: string[]
  performance_fee_min: number | null
  performance_fee_max: number | null
  available_for_booking: boolean
  profile_image_url: string | null
  description: string | null
}

export default function PromoterArtistsPage() {
  const [artists, setArtists] = useState<Artist[]>([])
  const [loading, setLoading] = useState(true)
  const [artistType, setArtistType] = useState('')
  const [genre, setGenre] = useState('')
  const [location, setLocation] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ availableForBooking: 'true' })
      if (artistType) params.set('artistType', artistType)
      if (genre) params.set('genre', genre)
      if (location) params.set('location', location)
      const res = await api.get(`/artists/search?${params}`)
      setArtists(res.data || [])
    } catch {
      setArtists([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const feeLabel = (a: Artist) => {
    if (!a.performance_fee_min && !a.performance_fee_max) return null
    if (a.performance_fee_min && a.performance_fee_max)
      return `$${a.performance_fee_min.toLocaleString()} – $${a.performance_fee_max.toLocaleString()}`
    if (a.performance_fee_min) return `From $${a.performance_fee_min.toLocaleString()}`
    return `Up to $${a.performance_fee_max!.toLocaleString()}`
  }

  return (
    <div className="bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Search bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Artist Type</label>
            <select
              value={artistType}
              onChange={e => setArtistType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Types</option>
              {Object.entries(ARTIST_TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Genre</label>
            <input
              value={genre}
              onChange={e => setGenre(e.target.value)}
              placeholder="Hip-hop, Jazz, EDM..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="City, State..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <Search className="w-4 h-4" />
            Search
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : artists.length === 0 ? (
          <div className="text-center py-20">
            <Mic2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No artists found</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your search filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {artists.map(a => {
              const displayName = a.stage_name || a.artist_name
              const typeLabel = ARTIST_TYPES[a.artist_type] || a.artist_type
              const emoji = typeLabel.split(' ')[0]
              const fee = feeLabel(a)

              return (
                <Link
                  key={a.id}
                  href={`/dashboard/promoter/artists/${a.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-md transition-all block group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {a.profile_image_url ? (
                        <img src={a.profile_image_url} alt={displayName} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <span>{emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-purple-700">{displayName}</p>
                      <p className="text-xs text-gray-500">{typeLabel.split(' ').slice(1).join(' ')}</p>
                      {a.location && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />{a.location}
                        </p>
                      )}
                      {a.genres?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {a.genres.slice(0, 3).map(g => (
                            <span key={g} className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">{g}</span>
                          ))}
                        </div>
                      )}
                      {fee && (
                        <p className="text-xs text-green-700 font-semibold mt-2">{fee}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <span className="w-full block text-center text-sm font-medium text-purple-600 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white rounded-lg py-2 transition-colors">
                      View &amp; Book
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
