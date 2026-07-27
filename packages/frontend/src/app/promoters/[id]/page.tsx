'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { MapPin, Globe, Instagram, Calendar, Ticket, Loader2 } from 'lucide-react'

interface TicketTier {
  id: string
  name: string
  price: number
  quantity: number
  quantity_sold: number
}

interface PublicEvent {
  id: string
  title: string
  event_date: string
  start_time: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  category: string | null
  image_url: string | null
  ticket_tiers: TicketTier[]
}

interface PromoterProfile {
  id: string
  company_name: string | null
  contact_name: string
  location: string | null
  bio: string | null
  website: string | null
  instagram: string | null
  profile_image_url: string | null
  cover_image_url: string | null
}

function fmtDate(d: string) {
  const [y, m, day] = d.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

function minPrice(tiers: TicketTier[]) {
  const prices = tiers.map(t => t.price).filter(p => p > 0)
  if (!prices.length) return 'Free'
  return `From $${Math.min(...prices).toFixed(2)}`
}

export default function PublicPromoterPage() {
  const { id } = useParams<{ id: string }>()
  const [profile, setProfile] = useState<PromoterProfile | null>(null)
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get(`/promoter/public/${id}`)
      .then(r => {
        setProfile(r.data.profile)
        setEvents(r.data.events || [])
      })
      .catch(() => setError('Promoter not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50">
        <p className="text-gray-600">Promoter not found.</p>
        <Link href="/events" className="text-purple-600 hover:underline text-sm">← Browse all events</Link>
      </div>
    )
  }

  const displayName = profile.company_name || profile.contact_name

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover */}
      <div className="relative h-44 md:h-60 bg-gradient-to-br from-purple-700 to-blue-700 overflow-hidden">
        {profile.cover_image_url && (
          <img src={profile.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />
        )}
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-4 left-4">
          <Link href="/events" className="text-white/80 hover:text-white text-sm">← All Events</Link>
        </div>
      </div>

      {/* Profile header */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-12 flex items-end gap-4 mb-4">
          <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden shrink-0">
            {profile.profile_image_url
              ? <img src={profile.profile_image_url} alt={displayName} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-purple-100 flex items-center justify-center text-3xl font-bold text-purple-600">
                  {displayName[0]?.toUpperCase()}
                </div>
            }
          </div>
          <div className="pb-2">
            <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
            {profile.location && (
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />{profile.location}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-5">
          {profile.website && (
            <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-full hover:bg-purple-100">
              <Globe className="w-3.5 h-3.5" /> Website
            </a>
          )}
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram.replace('@', '')}`}
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-pink-700 bg-pink-50 border border-pink-200 px-3 py-1.5 rounded-full hover:bg-pink-100">
              <Instagram className="w-3.5 h-3.5" /> @{profile.instagram.replace('@', '')}
            </a>
          )}
        </div>

        {profile.bio && (
          <p className="text-gray-700 text-sm leading-relaxed mb-6 max-w-2xl">{profile.bio}</p>
        )}

        {/* Events */}
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          Upcoming Events
        </h2>

        {events.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center mb-12">
            <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No upcoming events scheduled.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {events.map(ev => (
              <Link key={ev.id} href={`/events/${ev.id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-purple-300 transition-all group">
                <div className="aspect-video bg-purple-50 overflow-hidden">
                  {ev.image_url
                    ? <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Calendar className="w-10 h-10 text-purple-200" />
                      </div>
                  }
                </div>
                <div className="p-4">
                  {ev.category && (
                    <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">{ev.category}</span>
                  )}
                  <h3 className="font-semibold text-gray-900 mt-1.5 line-clamp-2">{ev.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{fmtDate(ev.event_date)}{ev.start_time ? ` · ${ev.start_time}` : ''}</p>
                  {(ev.venue_name || ev.city) && (
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {[ev.venue_name, ev.city, ev.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="text-sm font-semibold text-purple-700 mt-2">{minPrice(ev.ticket_tiers)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white py-8 mt-4">
        <a href="/" className="flex flex-col items-center gap-1.5 group">
          <p className="text-xs text-gray-400 uppercase tracking-widest group-hover:text-gray-600 transition-colors">Powered by</p>
          <img src="/eventecos-logo.jpg" alt="EventEcos" className="h-[120px] w-auto opacity-90 group-hover:opacity-100 transition-opacity" />
        </a>
      </footer>
    </div>
  )
}
