'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { MapPin, Calendar, Tag, Search, Filter, Loader2, Ticket } from 'lucide-react'

interface TicketTier {
  id: string
  name: string
  price: number
  quantity: number
  quantity_sold: number
}

interface PromoterAccount {
  company_name: string | null
  contact_name: string
}

interface PublicEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  category: string | null
  image_url: string | null
  age_restriction: string | null
  ticket_tiers: TicketTier[]
  promoter_accounts: PromoterAccount | null
}

const EVENT_CATEGORIES = [
  'Music', 'Comedy', 'Sports', 'Arts & Theater', 'Food & Drink',
  'Networking', 'Conference', 'Festival', 'Club Night', 'Other',
]

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')

  const fetchEvents = (c?: string, cat?: string) => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (c) params.city = c
    if (cat) params.category = cat
    api.get('/promoter-events/public', { params })
      .then(r => setEvents(r.data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchEvents() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchEvents(city, category)
  }

  const filtered = events.filter(e =>
    !search || e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.city?.toLowerCase().includes(search.toLowerCase()) ||
    e.venue_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-700 to-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Upcoming Events</h1>
          <p className="text-purple-200 text-lg">Find and buy tickets to events near you</p>

          {/* Search / Filter */}
          <form onSubmit={handleSearch} className="mt-8 bg-white rounded-2xl p-2 flex flex-col md:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 flex-1 px-3 border-r border-gray-200">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 px-3 border-r border-gray-200">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="City"
                className="w-28 text-sm text-gray-800 placeholder-gray-400 focus:outline-none" />
            </div>
            <div className="flex items-center gap-2 px-3">
              <Filter className="w-4 h-4 text-gray-400 shrink-0" />
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="text-sm text-gray-800 focus:outline-none bg-transparent">
                <option value="">All categories</option>
                {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button type="submit"
              className="bg-purple-600 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-purple-700">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* Events grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-xl font-semibold text-gray-600">No events found</p>
            <p className="text-gray-400 mt-1">Try adjusting the search or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(ev => {
              const dateObj = new Date(ev.event_date + 'T00:00:00')
              const minPrice = ev.ticket_tiers.length > 0
                ? Math.min(...ev.ticket_tiers.map(t => Number(t.price)))
                : null
              const isSoldOut = ev.ticket_tiers.length > 0 &&
                ev.ticket_tiers.every(t => t.quantity_sold >= t.quantity)
              const promoterName = ev.promoter_accounts?.company_name || ev.promoter_accounts?.contact_name

              return (
                <Link key={ev.id} href={`/events/${ev.id}`}
                  className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all group">
                  {/* Cover image */}
                  <div className="h-44 bg-gradient-to-br from-purple-100 to-pink-100 relative overflow-hidden">
                    {ev.image_url ? (
                      <img src={ev.image_url} alt={ev.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Calendar className="w-12 h-12 text-purple-300" />
                      </div>
                    )}
                    {ev.age_restriction && (
                      <span className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded">
                        {ev.age_restriction}
                      </span>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      {/* Date badge */}
                      <div className="text-center bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5 min-w-[44px] shrink-0">
                        <p className="text-xs font-medium text-purple-500 uppercase leading-none">
                          {dateObj.toLocaleString('default', { month: 'short' })}
                        </p>
                        <p className="text-lg font-bold text-purple-700 leading-none mt-0.5">{dateObj.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{ev.title}</h3>
                        {(ev.venue_name || ev.city) && (
                          <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            {ev.venue_name ? `${ev.venue_name}${ev.city ? ', ' + ev.city : ''}` : ev.city}
                            {ev.state ? `, ${ev.state}` : ''}
                          </p>
                        )}
                        {ev.start_time && (
                          <p className="text-xs text-gray-400 mt-0.5">{ev.start_time}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        {ev.category && (
                          <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            <Tag className="w-2.5 h-2.5" />{ev.category}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        {isSoldOut ? (
                          <span className="text-xs font-bold text-red-500">Sold Out</span>
                        ) : minPrice !== null ? (
                          <span className="text-sm font-bold text-gray-900">
                            {minPrice === 0 ? 'Free' : `From $${minPrice.toFixed(2)}`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400"><Ticket className="inline w-3 h-3 mr-0.5" />No tickets</span>
                        )}
                      </div>
                    </div>

                    {promoterName && (
                      <p className="text-xs text-gray-400 mt-2">By {promoterName}</p>
                    )}
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
