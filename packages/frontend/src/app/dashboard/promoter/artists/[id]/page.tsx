'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import {
  Loader2, MapPin, Globe, Instagram, Youtube, Music2,
  Phone, Mail, Clock, DollarSign, Mic2, ChevronLeft,
} from 'lucide-react'

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

interface ArtistProfile {
  id: string
  artist_name: string
  stage_name: string | null
  artist_type: string
  genres: string[]
  location: string | null
  description: string | null
  performance_fee_min: number | null
  performance_fee_max: number | null
  set_length_minutes: number | null
  travel_availability: string | null
  equipment_needs: string | null
  hospitality_requirements: string | null
  booking_contact_name: string | null
  booking_email: string | null
  booking_phone: string | null
  agency: string | null
  profile_image_url: string | null
  cover_image_url: string | null
  website: string | null
  instagram: string | null
  youtube: string | null
  spotify: string | null
  epk_url: string | null
  available_for_booking: boolean
}

export default function ArtistProfileForPromoterPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [artist, setArtist] = useState<ArtistProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.get(`/artists/${id}`)
      .then(r => setArtist(r.data))
      .catch(() => setError('Artist not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !artist) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 bg-gray-50">
        <Mic2 className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500">{error || 'Artist not found'}</p>
        <Link href="/dashboard/promoter/artists" className="text-purple-600 text-sm hover:underline">← Back to Artists</Link>
      </div>
    )
  }

  const displayName = artist.stage_name || artist.artist_name
  const typeLabel = ARTIST_TYPES[artist.artist_type] || artist.artist_type

  const bookingUrl = `/dashboard/promoter/bookings/new?artistId=${artist.id}&artistName=${encodeURIComponent(displayName)}&artistEmail=${encodeURIComponent(artist.booking_email || '')}&artistPhone=${encodeURIComponent(artist.booking_phone || '')}&feeMin=${artist.performance_fee_min ?? ''}&feeMax=${artist.performance_fee_max ?? ''}`

  return (
    <div className="bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {artist.cover_image_url && (
            <img src={artist.cover_image_url} alt="" className="w-full h-40 object-cover" />
          )}
          <div className="p-6 flex items-start gap-5">
            <div className="w-20 h-20 rounded-full bg-purple-100 flex items-center justify-center text-4xl flex-shrink-0 -mt-2">
              {artist.profile_image_url ? (
                <img src={artist.profile_image_url} alt={displayName} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <span>{typeLabel.split(' ')[0]}</span>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {artist.stage_name && artist.artist_name !== artist.stage_name && (
                <p className="text-sm text-gray-500 mt-0.5">a.k.a. {artist.artist_name}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">{typeLabel}</p>
              {artist.location && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />{artist.location}
                </p>
              )}
              {artist.genres?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {artist.genres.map(g => (
                    <span key={g} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-0.5 rounded-full">{g}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio */}
        {artist.description && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-2">About</h2>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{artist.description}</p>
          </div>
        )}

        {/* Performance Details */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-800 mb-1">Performance Details</h2>
          {(artist.performance_fee_min || artist.performance_fee_max) && (
            <div className="flex items-start gap-3">
              <DollarSign className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Performance Fee</p>
                <p className="text-sm text-gray-800">
                  {artist.performance_fee_min && artist.performance_fee_max
                    ? `$${artist.performance_fee_min.toLocaleString()} – $${artist.performance_fee_max.toLocaleString()}`
                    : artist.performance_fee_min
                    ? `From $${artist.performance_fee_min.toLocaleString()}`
                    : `Up to $${artist.performance_fee_max!.toLocaleString()}`}
                </p>
              </div>
            </div>
          )}
          {artist.set_length_minutes && (
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Set Length</p>
                <p className="text-sm text-gray-800">{artist.set_length_minutes} minutes</p>
              </div>
            </div>
          )}
          {artist.travel_availability && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Travel Availability</p>
                <p className="text-sm text-gray-800 capitalize">{artist.travel_availability.replace('_', ' ')}</p>
              </div>
            </div>
          )}
          {artist.equipment_needs && (
            <div className="flex items-start gap-3">
              <Music2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 font-medium">Equipment Needs</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{artist.equipment_needs}</p>
              </div>
            </div>
          )}
          {artist.hospitality_requirements && (
            <div className="flex items-start gap-3">
              <span className="text-sm mt-0.5">🏨</span>
              <div>
                <p className="text-xs text-gray-500 font-medium">Hospitality / Rider</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{artist.hospitality_requirements}</p>
              </div>
            </div>
          )}
        </div>

        {/* Booking Contact */}
        {(artist.booking_contact_name || artist.booking_email || artist.booking_phone || artist.agency) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-800 mb-1">Booking Contact</h2>
            {artist.agency && <p className="text-sm text-gray-600 font-medium">{artist.agency}</p>}
            {artist.booking_contact_name && (
              <p className="text-sm text-gray-700">{artist.booking_contact_name}</p>
            )}
            {artist.booking_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <a href={`mailto:${artist.booking_email}`} className="text-sm text-purple-600 hover:underline">{artist.booking_email}</a>
              </div>
            )}
            {artist.booking_phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${artist.booking_phone}`} className="text-sm text-gray-700">{artist.booking_phone}</a>
              </div>
            )}
          </div>
        )}

        {/* Links */}
        {(artist.website || artist.instagram || artist.youtube || artist.spotify || artist.epk_url) && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-3">Links</h2>
            <div className="flex flex-wrap gap-3">
              {artist.website && (
                <a href={artist.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-purple-600 border border-gray-200 rounded-lg px-3 py-2">
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
              {artist.instagram && (
                <a href={`https://instagram.com/${artist.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-pink-600 border border-gray-200 rounded-lg px-3 py-2">
                  <Instagram className="w-4 h-4" /> Instagram
                </a>
              )}
              {artist.youtube && (
                <a href={artist.youtube} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-2">
                  <Youtube className="w-4 h-4" /> YouTube
                </a>
              )}
              {artist.spotify && (
                <a href={artist.spotify} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-gray-700 hover:text-green-600 border border-gray-200 rounded-lg px-3 py-2">
                  <Music2 className="w-4 h-4" /> Spotify
                </a>
              )}
              {artist.epk_url && (
                <a href={artist.epk_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-purple-700 font-medium border border-purple-200 bg-purple-50 rounded-lg px-3 py-2 hover:bg-purple-100">
                  📄 EPK / Press Kit
                </a>
              )}
            </div>
          </div>
        )}

        {/* Book CTA */}
        {artist.available_for_booking && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white text-center">
            <Mic2 className="w-8 h-8 mx-auto mb-3 opacity-80" />
            <h3 className="text-lg font-bold mb-1">Ready to book {displayName}?</h3>
            <p className="text-purple-200 text-sm mb-4">Submit a booking request and lock in your date</p>
            <button
              onClick={() => router.push(bookingUrl)}
              className="px-6 py-3 bg-white text-purple-700 rounded-xl font-semibold text-sm hover:bg-purple-50"
            >
              Book This Artist
            </button>
          </div>
        )}

        {!artist.available_for_booking && (
          <div className="bg-gray-100 rounded-xl p-5 text-center text-gray-500 text-sm">
            This artist is currently not accepting new bookings.
          </div>
        )}
      </div>
    </div>
  )
}
