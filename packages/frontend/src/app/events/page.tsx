'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { MapPin, Calendar, Tag, Search, Filter, Loader2, Ticket, ExternalLink } from 'lucide-react'
import DashboardReturnButton from '@/components/DashboardReturnButton'

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

interface TicketmasterEvent {
  id: string
  title: string
  event_date: string
  start_time: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  image_url: string | null
  category: string | null
  min_price: number | null
  max_price: number | null
  ticketmaster_url: string
  source: 'ticketmaster'
}

interface PredictHQEvent {
  id: string
  title: string
  event_date: string
  start_time: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  category: string | null
  phq_rank: number | null
  predicthq_url: string
  source: 'predicthq'
}

interface ExternalEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  category: string | null
  image_url: string | null
  event_url: string | null
  price_min: number | null
  price_max: number | null
  organizer: string | null
  source: 'external'
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
  zip_code: string | null
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
  const [tmEvents, setTmEvents] = useState<TicketmasterEvent[]>([])
  const [extEvents, setExtEvents] = useState<ExternalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [tmLoading, setTmLoading] = useState(false)
  const [extLoading, setExtLoading] = useState(false)
  const [zipCode, setZipCode] = useState('')
  const [radiusMiles, setRadiusMiles] = useState('30')
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [dateFilter, setDateFilter] = useState<'' | 'weekend' | 'week' | 'month'>('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<Array<{ displayName: string; city: string; state: string; zip: string; lat: number; lng: number }>>([])
  const [showCitySuggestions, setShowCitySuggestions] = useState(false)
  const [cityLoading, setCityLoading] = useState(false)
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cityBoxRef = useRef<HTMLDivElement>(null)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

  // Close the city suggestions dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cityBoxRef.current && !cityBoxRef.current.contains(e.target as Node)) {
        setShowCitySuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const matchesDateFilter = useCallback((eventDate: string) => {
    if (!dateFilter) return true
    const d = new Date(eventDate + 'T00:00:00')
    if (dateFilter === 'month') {
      return eventDate.slice(0, 7) === selectedMonth
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (d < today) return false
    if (dateFilter === 'week') {
      const endOfWeek = new Date(today)
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
      endOfWeek.setHours(23, 59, 59, 999)
      return d <= endOfWeek
    }
    // weekend: the upcoming (or current) Saturday through Sunday
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() + daysUntilSaturday)
    const sunday = new Date(saturday)
    sunday.setDate(saturday.getDate() + 1)
    sunday.setHours(23, 59, 59, 999)
    return d >= saturday && d <= sunday
  }, [dateFilter, selectedMonth])

  const toggleDateFilter = (value: 'weekend' | 'week' | 'month') => {
    if (value === 'month') {
      setShowMonthPicker(prev => dateFilter === 'month' ? !prev : true)
      setDateFilter('month')
      return
    }
    setShowMonthPicker(false)
    setDateFilter(prev => prev === value ? '' : value)
  }


  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported.'); return }
    setLocating(true)
    setLocationError('')
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords
          const res = await fetch(`${API_URL}/vendors/geocode/reverse?lat=${latitude}&lng=${longitude}`)
          if (res.ok) {
            const data = await res.json()
            if (data?.zip) {
              setZipCode(data.zip)
              setCityQuery([data.city, data.state].filter(Boolean).join(', '))
              fetchEvents(data.zip, category, radiusMiles)
            }
          }
        } catch {
          setLocationError('Could not determine your location.')
        } finally {
          setLocating(false)
        }
      },
      () => { setLocating(false); setLocationError('Location access denied. Enter a city instead.') },
      { timeout: 10000 },
    )
  }, [category, radiusMiles])

  // Resolve a zip code for a suggestion that has coordinates but no postcode
  // (common for large-city Nominatim results) via reverse geocoding.
  const resolveZipFromCoords = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`${API_URL}/vendors/geocode/reverse?lat=${lat}&lng=${lng}`)
      if (res.ok) {
        const data = await res.json()
        return data?.zip || ''
      }
    } catch {
      // ignore — search will proceed without a resolved zip
    }
    return ''
  }

  const fetchCitySuggestions = useCallback(async (query: string) => {
    if (query.trim().length < 3) {
      setCitySuggestions([])
      setShowCitySuggestions(false)
      return
    }
    setCityLoading(true)
    try {
      const res = await fetch(`${API_URL}/vendors/geocode/autocomplete?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setCitySuggestions(data)
        setShowCitySuggestions(data.length > 0)
      }
    } catch {
      // silently fail — user can still press Search without picking a suggestion
    } finally {
      setCityLoading(false)
    }
  }, [API_URL])

  const handleCityInputChange = (val: string) => {
    setCityQuery(val)
    if (cityDebounceRef.current) clearTimeout(cityDebounceRef.current)
    cityDebounceRef.current = setTimeout(() => fetchCitySuggestions(val), 350)
  }

  const handleCitySelect = async (s: { city: string; state: string; zip: string; lat: number; lng: number }) => {
    setShowCitySuggestions(false)
    setCitySuggestions([])
    setCityQuery([s.city, s.state].filter(Boolean).join(', '))
    const resolvedZip = s.zip || await resolveZipFromCoords(s.lat, s.lng)
    setZipCode(resolvedZip)
    fetchEvents(resolvedZip, category, radiusMiles)
  }

  const fetchEvents = (zip?: string, cat?: string, radius?: string) => {
    setLoading(true)
    setTmLoading(true)
    setExtLoading(true)
    const params: Record<string, string> = {}
    if (zip) params.zip_code = zip
    if (cat) params.category = cat
    if (zip && radius) params.radius_miles = radius
    const tmParams: Record<string, string> = { ...params }
    if (zip && radius) tmParams.radius_miles = radius
    Promise.all([
      api.get('/promoter-events/public', { params }),
      api.get('/ticketmaster/events', { params: tmParams }),
      api.get('/external-events/events', { params }),
    ])
      .then(([platformRes, tmRes, extRes]) => {
        setEvents(platformRes.data || [])
        setTmEvents(tmRes.data || [])
        setExtEvents(extRes.data || [])
      })
      .catch(() => {})
      .finally(() => { setLoading(false); setTmLoading(false); setExtLoading(false) })
  }

  useEffect(() => { fetchEvents() }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    let zip = zipCode
    // If the user typed a city but hit Search without picking a dropdown
    // suggestion, resolve the typed text to a zip before searching.
    if (cityQuery.trim()) {
      const match = citySuggestions[0] || (await (async () => {
        try {
          const res = await fetch(`${API_URL}/vendors/geocode/autocomplete?q=${encodeURIComponent(cityQuery.trim())}`)
          if (res.ok) {
            const data = await res.json()
            return data[0]
          }
        } catch {
          // ignore — fall back to whatever zip is already set
        }
        return undefined
      })())
      if (match) {
        zip = match.zip || await resolveZipFromCoords(match.lat, match.lng)
        setZipCode(zip)
      }
    }
    setShowCitySuggestions(false)
    fetchEvents(zip, category, radiusMiles)
  }

  const filtered = events.filter(e =>
    matchesDateFilter(e.event_date) &&
    (!search || e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.city?.toLowerCase().includes(search.toLowerCase()) ||
    e.venue_name?.toLowerCase().includes(search.toLowerCase()))
  )

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
              <Link href="/vendors" className="text-gray-700 hover:text-primary-600 font-medium text-sm border border-gray-300 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors hidden md:inline-flex">
                Find Vendors
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
        <img src="/lib/Events-Banner.jpg" alt="Explore Events" className="w-full h-full object-cover" />
      </div>

      {/* Search Header */}
      <div className="bg-blue-500 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center">
          <p className="text-blue-200 text-lg">Find and buy tickets to events near you</p>

          {/* Search / Filter */}
          <div className="flex justify-center mt-4 mb-2">
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating}
              className="px-4 py-2 border border-blue-300 rounded-lg text-blue-100 hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {locating ? 'Locating...' : '📍 Use My Location'}
            </button>
          </div>
          <form onSubmit={handleSearch} className="mt-2 bg-white rounded-2xl p-2 flex flex-col md:flex-row gap-2 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 flex-1 px-3 border-r border-gray-200">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search events..."
                className="w-full text-sm text-gray-800 placeholder-gray-400 focus:outline-none" />
            </div>
            <div ref={cityBoxRef} className="relative flex items-center gap-2 px-3 border-r border-gray-200">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <input value={cityQuery} onChange={e => handleCityInputChange(e.target.value)}
                onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
                placeholder="City"
                autoComplete="off"
                className="w-28 text-sm text-gray-800 placeholder-gray-400 focus:outline-none" />
              {cityLoading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />}
              {showCitySuggestions && citySuggestions.length > 0 && (
                <ul className="absolute left-0 top-full mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50 text-left">
                  {citySuggestions.map((s, i) => (
                    <li key={i}>
                      <button type="button" onMouseDown={() => handleCitySelect(s)}
                        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-purple-50 transition-colors">
                        <MapPin className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-gray-800">{[s.city, s.state].filter(Boolean).join(', ')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 border-r border-gray-200">
              <select value={radiusMiles} onChange={e => setRadiusMiles(e.target.value)}
                className="text-sm text-gray-800 focus:outline-none bg-transparent">
                <option value="10">10 miles</option>
                <option value="25">25 miles</option>
                <option value="30">30 miles</option>
                <option value="50">50 miles</option>
                <option value="75">75 miles</option>
                <option value="100">100 miles</option>
              </select>
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
              className="bg-purple-800 text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-purple-900">
              Search
            </button>
          </form>
          {locationError && <p className="text-red-300 text-sm mt-2">{locationError}</p>}

          {/* Quick date navigation — designed for phone-screen use */}
          <div className="mt-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:justify-center sm:overflow-visible">
              <button
                type="button"
                onClick={() => toggleDateFilter('weekend')}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  dateFilter === 'weekend'
                    ? 'bg-white text-blue-700 border-white'
                    : 'bg-blue-600/40 text-white border-blue-300 hover:bg-blue-600/60'
                }`}
              >
                This Weekend
              </button>
              <button
                type="button"
                onClick={() => toggleDateFilter('week')}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  dateFilter === 'week'
                    ? 'bg-white text-blue-700 border-white'
                    : 'bg-blue-600/40 text-white border-blue-300 hover:bg-blue-600/60'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => toggleDateFilter('month')}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  dateFilter === 'month'
                    ? 'bg-white text-blue-700 border-white'
                    : 'bg-blue-600/40 text-white border-blue-300 hover:bg-blue-600/60'
                }`}
              >
                {dateFilter === 'month'
                  ? new Date(selectedMonth + '-01T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })
                  : 'Select Month'}
              </button>
              {dateFilter && (
                <button
                  type="button"
                  onClick={() => { setDateFilter(''); setShowMonthPicker(false) }}
                  className="shrink-0 px-3 py-2 rounded-full text-sm font-medium text-blue-100 hover:text-white underline underline-offset-2"
                >
                  Clear
                </button>
              )}
            </div>
            {showMonthPicker && (
              <div className="mt-2 flex justify-center">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => { setSelectedMonth(e.target.value); setDateFilter('month') }}
                  className="text-sm text-gray-800 bg-white rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Events grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>
        ) : filtered.length === 0 ? (
          // Only show the empty state once Ticketmaster/external events have
          // also finished loading and turned up nothing — if either of those
          // sources has events, skip straight to their sections below
          // instead of telling the user "No events found".
          !tmLoading && !extLoading && tmEvents.length === 0 && extEvents.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-xl font-semibold text-gray-600">No events found</p>
              <p className="text-gray-400 mt-1">Try adjusting the search or check back later</p>
            </div>
          ) : null
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

      {/* ── Aggregated External Events (Internal-API) ───────────── */}
      {(extLoading || extEvents.length > 0) && (
        <div className="max-w-6xl mx-auto px-4 pb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Events Around Town</h2>
              <p className="text-xs text-gray-400 mt-0.5">Aggregated from local event listings.</p>
            </div>
          </div>

          {extLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-400" /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {extEvents
                .filter(ev => matchesDateFilter(ev.event_date) && (!search ||
                  ev.title.toLowerCase().includes(search.toLowerCase()) ||
                  ev.city?.toLowerCase().includes(search.toLowerCase()) ||
                  ev.venue_name?.toLowerCase().includes(search.toLowerCase())))
                .map(ev => {
                  const dateObj = ev.event_date ? new Date(ev.event_date + 'T00:00:00') : null
                  const card = (
                    <>
                      <div className="h-44 bg-gradient-to-br from-purple-100 to-fuchsia-100 relative overflow-hidden">
                        {ev.image_url ? (
                          <img src={ev.image_url} alt={ev.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Calendar className="w-12 h-12 text-purple-300" />
                          </div>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          {dateObj && (
                            <div className="text-center bg-purple-50 border border-purple-100 rounded-lg px-2.5 py-1.5 min-w-[44px] shrink-0">
                              <p className="text-xs font-medium text-purple-500 uppercase leading-none">
                                {dateObj.toLocaleString('default', { month: 'short' })}
                              </p>
                              <p className="text-lg font-bold text-purple-700 leading-none mt-0.5">{dateObj.getDate()}</p>
                            </div>
                          )}
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
                          <div>
                            {ev.category && (
                              <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                                <Tag className="w-2.5 h-2.5" />{ev.category}
                              </span>
                            )}
                          </div>
                          {ev.price_min !== null ? (
                            <span className="text-sm font-bold text-gray-900">
                              {ev.price_min === 0 ? 'Free' : `From $${ev.price_min.toFixed(0)}`}
                            </span>
                          ) : ev.event_url ? (
                            <span className="text-xs text-gray-400">See details</span>
                          ) : null}
                        </div>
                      </div>
                    </>
                  )
                  return ev.event_url ? (
                    <a
                      key={ev.id}
                      href={ev.event_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-purple-200 transition-all group block"
                    >
                      {card}
                    </a>
                  ) : (
                    <div
                      key={ev.id}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group block"
                    >
                      {card}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Ticketmaster Events ────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 pb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Discover More Events</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Powered by{' '}
              <a href="https://www.ticketmaster.com" target="_blank" rel="noopener noreferrer"
                className="underline hover:text-blue-600">Ticketmaster</a>
              . Tickets sold by Ticketmaster.
            </p>
          </div>
        </div>

        {tmLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-blue-400" /></div>
        ) : tmEvents.length === 0 ? (
          // Only show a "no results" message for Ticketmaster if the other
          // sources (native + external aggregated) also have nothing to show —
          // otherwise let those results speak for themselves without an odd
          // "no results" message sitting between two sections that do have events.
          zipCode && filtered.length === 0 && !extLoading && extEvents.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No Ticketmaster events found in this area.</p>
          ) : !zipCode ? (
            <p className="text-gray-400 text-sm text-center py-8">Enter a city to discover events near you.</p>
          ) : null
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tmEvents
              .filter(ev => matchesDateFilter(ev.event_date) && (!search ||
                ev.title.toLowerCase().includes(search.toLowerCase()) ||
                ev.city?.toLowerCase().includes(search.toLowerCase()) ||
                ev.venue_name?.toLowerCase().includes(search.toLowerCase())))
              .map(ev => {
                const dateObj = ev.event_date ? new Date(ev.event_date + 'T00:00:00') : null
                return (
                  <a
                    key={ev.id}
                    href={ev.ticketmaster_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group block"
                  >
                    {/* Cover image */}
                    <div className="h-44 bg-gradient-to-br from-blue-100 to-indigo-100 relative overflow-hidden">
                      {ev.image_url ? (
                        <img src={ev.image_url} alt={ev.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Calendar className="w-12 h-12 text-blue-300" />
                        </div>
                      )}
                      {/* Ticketmaster badge */}
                      <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                        Ticketmaster
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        {dateObj && (
                          <div className="text-center bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 min-w-[44px] shrink-0">
                            <p className="text-xs font-medium text-blue-500 uppercase leading-none">
                              {dateObj.toLocaleString('default', { month: 'short' })}
                            </p>
                            <p className="text-lg font-bold text-blue-700 leading-none mt-0.5">{dateObj.getDate()}</p>
                          </div>
                        )}
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
                        <div>
                          {ev.category && (
                            <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              <Tag className="w-2.5 h-2.5" />{ev.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-right">
                          {ev.min_price !== null ? (
                            <span className="text-sm font-bold text-gray-900">
                              {ev.min_price === 0 ? 'Free' : `From $${ev.min_price.toFixed(0)}`}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">See prices</span>
                          )}
                          <ExternalLink className="w-3 h-3 text-gray-400 ml-1" />
                        </div>
                      </div>
                    </div>
                  </a>
                )
              })}
          </div>
        )}
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
