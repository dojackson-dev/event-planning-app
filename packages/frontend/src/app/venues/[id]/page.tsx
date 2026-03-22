'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { MapPin, Phone, Globe, Users, Star, ArrowLeft, Building2 } from 'lucide-react'
import DashboardReturnButton from '@/components/DashboardReturnButton'

interface VenueProfile {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip_code: string
  capacity: number
  description: string
  profile_image_url: string
  website: string
  phone: string
  latitude: number
  longitude: number
  owner_account_id: string
}

export default function VenueProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [venue, setVenue] = useState<VenueProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/vendors/venue/${params.id}`)
        setVenue(res.data)
      } catch {
        router.push('/venues')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  if (!venue) return null

  const initials = venue.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/vendors?tab=venues" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Directory
          </Link>
          <div className="ml-auto">
            <DashboardReturnButton />
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="w-24 h-24 rounded-2xl border border-gray-100 bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {venue.profile_image_url ? (
                <img src={venue.profile_image_url} alt={venue.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-gray-400">{initials || '🏛️'}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900">{venue.name}</h1>
                <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700">
                  <Building2 className="w-3.5 h-3.5" /> Venue
                </span>
              </div>

              {(venue.city || venue.state) && (
                <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {[venue.address, venue.city, venue.state, venue.zip_code].filter(Boolean).join(', ')}
                </p>
              )}

              {venue.capacity && (
                <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                  <Users className="w-4 h-4 text-gray-400" />
                  Up to {venue.capacity.toLocaleString()} guests
                </p>
              )}

              {/* Contact row */}
              <div className="flex flex-wrap gap-3 mt-4">
                {venue.website && (
                  <a
                    href={venue.website.startsWith('http') ? venue.website : `https://${venue.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary-700 transition-colors"
                  >
                    <Globe className="w-4 h-4" /> Visit Website
                  </a>
                )}
                {venue.phone && (
                  <a
                    href={`tel:${venue.phone}`}
                    className="inline-flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm font-semibold px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <Phone className="w-4 h-4" /> {venue.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {venue.description && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">About This Venue</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-line">{venue.description}</p>
          </div>
        )}

        {/* Map placeholder / location detail */}
        {(venue.city || venue.state) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Location</h2>
            <p className="text-gray-600 text-sm">
              {[venue.address, venue.city, venue.state, venue.zip_code].filter(Boolean).join(', ')}
            </p>
            {venue.latitude && venue.longitude && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-primary-600 hover:text-primary-800 text-sm font-medium mt-2"
              >
                <MapPin className="w-4 h-4" /> View on Google Maps →
              </a>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="bg-primary-50 border border-primary-100 rounded-2xl p-6 text-center">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Interested in this venue?</h3>
          <p className="text-gray-500 text-sm mb-4">Reach out directly to learn about availability and pricing.</p>
          <div className="flex justify-center gap-3 flex-wrap">
            {venue.website && (
              <a
                href={venue.website.startsWith('http') ? venue.website : `https://${venue.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-700 transition-colors"
              >
                Visit Website
              </a>
            )}
            {venue.phone && (
              <a
                href={`tel:${venue.phone}`}
                className="border border-primary-300 text-primary-700 text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-primary-100 transition-colors"
              >
                Call Now
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
