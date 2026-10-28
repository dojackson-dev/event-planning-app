'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import {
  MapPin, Search, Loader2, Tag, ChevronDown, ChevronRight, Crosshair, CalendarDays, Calendar,
  LayoutGrid, Music, Laugh, Trophy, Palette, UtensilsCrossed, Users, Briefcase, PartyPopper, Wine, MoreHorizontal,
  type LucideIcon,
} from 'lucide-react'
import DashboardReturnButton from '@/components/DashboardReturnButton'
import NonprofitBadge from '@/components/NonprofitBadge'
import MonthPicker from '@/components/events/MonthPicker'
import BottomSheet from '@/components/events/BottomSheet'
import EventListingCard from '@/components/events/EventListingCard'
import { searchPlaces } from '@/lib/places'
import FollowUs from '@/components/SocialLinks'

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
  is_nonprofit?: boolean | null
  nonprofit_status?: string | null
  nonprofit_legal_name?: string | null
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

interface TevoEvent {
  id: string
  title: string
  event_date: string
  start_time: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  category: string | null
  event_url: string | null
  image_url: string | null
  source: 'ticket_evolution'
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

interface Place {
  city: string
  state: string
  zip: string
  lat?: number
  lng?: number
}

type DateFilter = '' | 'today' | 'weekend' | 'week' | 'month'

// The values are what the backend filters on; the icons are only for the picker.
const EVENT_CATEGORIES: Array<{ value: string; icon: LucideIcon }> = [
  { value: 'Music', icon: Music },
  { value: 'Comedy', icon: Laugh },
  { value: 'Sports', icon: Trophy },
  { value: 'Arts & Theater', icon: Palette },
  { value: 'Food & Drink', icon: UtensilsCrossed },
  { value: 'Networking', icon: Users },
  { value: 'Conference', icon: Briefcase },
  { value: 'Festival', icon: PartyPopper },
  { value: 'Club Night', icon: Wine },
  { value: 'Other', icon: MoreHorizontal },
]

const DISTANCES = ['5', '15', '30', '50', '100']
const DEFAULT_RADIUS = '30'

// Page sizes must match each backend endpoint's default page/limit size so
// "did this page come back full" is a reliable signal for "there's more".
const EXT_PAGE_SIZE = 100
const TEVO_PAGE_SIZE = 24
const PLATFORM_PAGE_SIZE = 100

const RECENTS_KEY = 'eventecos:recent-locations'
const FAVORITES_KEY = 'eventecos:favorite-events'
const MAX_RECENTS = 4

// Live by default; set NEXT_PUBLIC_ENABLE_TICKET_EVOLUTION_EVENTS=false to hide the section.
const ENABLE_TICKET_EVOLUTION_PUBLIC_EVENTS =
  process.env.NEXT_PUBLIC_ENABLE_TICKET_EVOLUTION_EVENTS !== 'false'

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const writeStored = (key: string, value: unknown) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)) } catch { /* private mode: not saved */ }
}

const placeLabel = (p: { city: string; state: string }) => [p.city, p.state].filter(Boolean).join(', ')

// ── Chips ──────────────────────────────────────────────────────────────────
const chipBase = 'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors'
const chipIdle = 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
const chipActive = 'border-indigo-600 bg-indigo-600 text-white'

export default function PublicEventsPage() {
  const [events, setEvents] = useState<PublicEvent[]>([])
  const [extEvents, setExtEvents] = useState<ExternalEvent[]>([])
  const [tevoEvents, setTevoEvents] = useState<TevoEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [extLoading, setExtLoading] = useState(false)
  const [tevoLoading, setTevoLoading] = useState(false)
  // "Load More" pagination — one page cursor + hasMore/loadingMore flag per
  // provider, reset whenever a fresh search/filter triggers fetchEvents().
  const [extOffset, setExtOffset] = useState(EXT_PAGE_SIZE)
  const [extHasMore, setExtHasMore] = useState(false)
  const [extLoadingMore, setExtLoadingMore] = useState(false)
  const [extMoreError, setExtMoreError] = useState(false)
  const [tevoPage, setTevoPage] = useState(2)
  const [tevoHasMore, setTevoHasMore] = useState(false)
  const [tevoLoadingMore, setTevoLoadingMore] = useState(false)
  const [tevoMoreError, setTevoMoreError] = useState(false)
  const [platformOffset, setPlatformOffset] = useState(PLATFORM_PAGE_SIZE)
  const [platformHasMore, setPlatformHasMore] = useState(false)
  const [platformLoadingMore, setPlatformLoadingMore] = useState(false)
  const [platformMoreError, setPlatformMoreError] = useState(false)

  const [zipCode, setZipCode] = useState('')
  const [locationName, setLocationName] = useState('')
  const [radiusMiles, setRadiusMiles] = useState(DEFAULT_RADIUS)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [locating, setLocating] = useState(false)
  const [locationError, setLocationError] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [showMonthPicker, setShowMonthPicker] = useState(false)

  // Sheets
  const [locationSheet, setLocationSheet] = useState(false)
  const [filterSheet, setFilterSheet] = useState(false)
  const [pendingRadius, setPendingRadius] = useState(DEFAULT_RADIUS)
  const [pendingCategory, setPendingCategory] = useState('')
  const [sheetQuery, setSheetQuery] = useState('')
  const [sheetResults, setSheetResults] = useState<Place[]>([])
  const [sheetLoading, setSheetLoading] = useState(false)
  const [recents, setRecents] = useState<Place[]>([])
  const [nearby, setNearby] = useState<Place[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const sheetDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSearchRef = useRef('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const cityOnly = locationName.split(',')[0]

  const matchesDateFilter = useCallback((eventDate: string) => {
    if (!dateFilter) return true
    const d = new Date(eventDate + 'T00:00:00')
    if (dateFilter === 'month') {
      return eventDate.slice(0, 7) === selectedMonth
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (d < today) return false
    if (dateFilter === 'today') return d.getTime() === today.getTime()
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

  // The backend can only scope its "soonest upcoming" queries by an explicit
  // date range — filtering the already-fetched (capped) batch client-side
  // isn't enough once a busy near-term date crowds out a later month/week.
  const computeDateRange = (filter: DateFilter, month: string): { from?: string; to?: string } => {
    if (!filter) return {}
    const pad = (n: number) => String(n).padStart(2, '0')
    const fmtLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    if (filter === 'month') {
      const [y, m] = month.split('-').map(Number)
      return { from: fmtLocal(new Date(y, m - 1, 1)), to: fmtLocal(new Date(y, m, 0)) }
    }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (filter === 'today') return { from: fmtLocal(today), to: fmtLocal(today) }
    if (filter === 'week') {
      const endOfWeek = new Date(today)
      endOfWeek.setDate(today.getDate() + (7 - today.getDay()))
      return { from: fmtLocal(today), to: fmtLocal(endOfWeek) }
    }
    // weekend: the upcoming (or current) Saturday through Sunday
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7
    const saturday = new Date(today)
    saturday.setDate(today.getDate() + daysUntilSaturday)
    const sunday = new Date(saturday)
    sunday.setDate(saturday.getDate() + 1)
    return { from: fmtLocal(saturday), to: fmtLocal(sunday) }
  }

  const pickDate = (value: DateFilter) => {
    setShowMonthPicker(false)
    const next = dateFilter === value ? '' : value
    setDateFilter(next)
    fetchEvents(zipCode, category, radiusMiles, computeDateRange(next, selectedMonth), search)
  }

  const toggleMonthPicker = () => setShowMonthPicker(open => !open)

  // ── Location ─────────────────────────────────────────────────────────────
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

  const saveRecent = (place: Place) => {
    setRecents(prev => {
      const next = [place, ...prev.filter(p => p.zip !== place.zip)].slice(0, MAX_RECENTS)
      writeStored(RECENTS_KEY, next)
      return next
    })
  }

  const chooseLocation = async (picked: Place) => {
    let place = picked
    const zip = picked.zip || (picked.lat !== undefined && picked.lng !== undefined
      ? await resolveZipFromCoords(picked.lat, picked.lng)
      : '')
    if (zip) {
      // Canonical "City, ST" naming (autocomplete returns the full state name).
      try {
        const res = await fetch(`${API_URL}/vendors/geocode/zip?zip=${zip}`)
        if (res.ok) {
          const z = await res.json()
          place = { city: z.city, state: z.state, zip, lat: z.lat, lng: z.lng }
        } else {
          place = { ...picked, zip }
        }
      } catch {
        place = { ...picked, zip }
      }
      saveRecent(place)
    }
    setZipCode(zip)
    setLocationName(placeLabel(place))
    setLocationError('')
    setLocationSheet(false)
    fetchEvents(zip, category, radiusMiles, computeDateRange(dateFilter, selectedMonth), search)
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
            if (data?.zip) await chooseLocation({ city: data.city, state: data.state, zip: data.zip })
          }
        } catch {
          setLocationError('Could not determine your location.')
        } finally {
          setLocating(false)
        }
      },
      () => { setLocating(false); setLocationError('Location access denied. Choose a city instead.') },
      { timeout: 10000 },
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL, category, radiusMiles, dateFilter, selectedMonth, search])

  // City or ZIP typed into the location sheet: suggestions appear from the second letter.
  const sheetAbortRef = useRef<AbortController | null>(null)
  const onSheetQuery = (value: string) => {
    setSheetQuery(value)
    if (sheetDebounceRef.current) clearTimeout(sheetDebounceRef.current)
    sheetAbortRef.current?.abort()
    const q = value.trim()
    if (q.length < 2) { setSheetResults([]); setSheetLoading(false); return }
    setSheetLoading(true)
    const controller = new AbortController()
    sheetAbortRef.current = controller
    sheetDebounceRef.current = setTimeout(async () => {
      try {
        const found = await searchPlaces(q, controller.signal, 8)
        if (!controller.signal.aborted) setSheetResults(found)
      } catch {
        // aborted by a newer keystroke, or offline
      } finally {
        if (!controller.signal.aborted) setSheetLoading(false)
      }
    }, 150)
  }

  const closeLocationSheet = useCallback(() => {
    setLocationSheet(false)
    setSheetQuery('')
    setSheetResults([])
  }, [])

  // ── Filters sheet ────────────────────────────────────────────────────────
  const openFilterSheet = () => {
    setPendingRadius(radiusMiles)
    setPendingCategory(category)
    setFilterSheet(true)
  }
  const applyFilters = () => {
    setRadiusMiles(pendingRadius)
    setCategory(pendingCategory)
    setFilterSheet(false)
    fetchEvents(zipCode, pendingCategory, pendingRadius, computeDateRange(dateFilter, selectedMonth), search)
  }
  const closeFilterSheet = useCallback(() => setFilterSheet(false), [])

  // ── Favorites (kept on this device) ──────────────────────────────────────
  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      writeStored(FAVORITES_KEY, next)
      return next
    })
  }

  // ── Data ─────────────────────────────────────────────────────────────────
  const fetchEvents = (zip?: string, cat?: string, radius?: string, dateRange?: { from?: string; to?: string }, searchTerm?: string) => {
    setLoading(true)
    setExtLoading(true)
    setTevoLoading(ENABLE_TICKET_EVOLUTION_PUBLIC_EVENTS)
    // Searching by name looks everywhere — the show you're after is often
    // outside the saved location.
    const term = searchTerm?.trim() ?? ''
    lastSearchRef.current = searchTerm ?? ''
    const locationZip = term ? undefined : zip
    const params: Record<string, string> = {}
    if (locationZip) params.zip_code = locationZip
    if (cat) params.category = cat
    if (locationZip && radius) params.radius_miles = radius
    if (dateRange?.from) params.date_from = dateRange.from
    if (dateRange?.to) params.date_to = dateRange.to
    if (term) params.q = term
    const tevoParams: Record<string, string> = {}
    if (dateRange?.from) tevoParams.date_from = dateRange.from
    if (dateRange?.to) tevoParams.date_to = dateRange.to
    if (locationZip) tevoParams.zip_code = locationZip
    if (locationZip && radius) tevoParams.radius_miles = radius
    if (term) tevoParams.name = term
    const platformParams = { ...params, limit: String(PLATFORM_PAGE_SIZE) }
    const requests: Array<Promise<{ data: any[] }>> = [
      api.get('/promoter-events/public', { params: platformParams }),
      api.get('/external-events/events', { params }),
    ]
    if (ENABLE_TICKET_EVOLUTION_PUBLIC_EVENTS) {
      requests.push(api.get('/ticket-evolution/public-events', { params: tevoParams }))
    }
    Promise.allSettled(requests)
      .then(([platformRes, extRes, tevoRes]) => {
        const platformRows: PublicEvent[] = platformRes.status === 'fulfilled' ? platformRes.value.data || [] : []
        setEvents(platformRows)
        setPlatformOffset(PLATFORM_PAGE_SIZE)
        setPlatformHasMore(platformRows.length === PLATFORM_PAGE_SIZE)
        setPlatformMoreError(false)

        const extRows: ExternalEvent[] = extRes.status === 'fulfilled' ? extRes.value.data || [] : []
        setExtEvents(extRows)
        setExtOffset(EXT_PAGE_SIZE)
        setExtHasMore(extRows.length === EXT_PAGE_SIZE)

        const tevoRows: TevoEvent[] =
          ENABLE_TICKET_EVOLUTION_PUBLIC_EVENTS && tevoRes?.status === 'fulfilled'
            ? tevoRes.value.data || []
            : []
        setTevoEvents(tevoRows)
        setTevoPage(2)
        setTevoHasMore(tevoRows.length >= TEVO_PAGE_SIZE)
      })
      .finally(() => { setLoading(false); setExtLoading(false); setTevoLoading(false) })
  }

  // Filters for "Load more" — must match what the last full fetch used.
  const loadMoreFilters = () => {
    const term = lastSearchRef.current.trim()
    const filters: Record<string, string> = {}
    if (!term && zipCode) {
      filters.zip_code = zipCode
      if (radiusMiles) filters.radius_miles = radiusMiles
    }
    if (category) filters.category = category
    const range = computeDateRange(dateFilter, selectedMonth)
    if (range.from) filters.date_from = range.from
    if (range.to) filters.date_to = range.to
    if (term) filters.q = term
    return filters
  }

  // Each provider only returns one capped page per request — these fetch the
  // next page and append, using the same filters as the last full fetch.
  const loadMorePlatformEvents = async () => {
    setPlatformLoadingMore(true)
    setPlatformMoreError(false)
    try {
      const params: Record<string, string> = {
        offset: String(platformOffset),
        limit: String(PLATFORM_PAGE_SIZE),
      }
      Object.assign(params, loadMoreFilters())
      const res = await api.get('/promoter-events/public', { params })
      const rows: PublicEvent[] = res.data || []
      setEvents(prev => {
        const existingIds = new Set(prev.map(event => event.id))
        return [...prev, ...rows.filter(event => !existingIds.has(event.id))]
      })
      setPlatformHasMore(rows.length === PLATFORM_PAGE_SIZE)
      setPlatformOffset(prev => prev + PLATFORM_PAGE_SIZE)
    } catch {
      setPlatformMoreError(true)
    } finally {
      setPlatformLoadingMore(false)
    }
  }

  const loadMoreExternalEvents = async () => {
    setExtLoadingMore(true)
    setExtMoreError(false)
    try {
      const params: Record<string, string> = { offset: String(extOffset), ...loadMoreFilters() }
      const res = await api.get('/external-events/events', { params })
      const rows: ExternalEvent[] = res.data || []
      const existingIds = new Set(extEvents.map(event => event.id))
      const newRows = rows.filter(event => !existingIds.has(event.id))
      setExtEvents(prev => [...prev, ...newRows])
      setExtHasMore(rows.length === EXT_PAGE_SIZE && newRows.length > 0)
      setExtOffset(prev => prev + EXT_PAGE_SIZE)
    } catch {
      setExtMoreError(true)
    } finally {
      setExtLoadingMore(false)
    }
  }

  const loadMoreTevoEvents = async () => {
    setTevoLoadingMore(true)
    setTevoMoreError(false)
    try {
      const { q, ...filters } = loadMoreFilters()
      const params: Record<string, string> = { page: String(tevoPage), ...filters }
      delete params.category
      if (q) params.name = q
      const res = await api.get('/ticket-evolution/public-events', { params })
      const rows: TevoEvent[] = res.data || []
      const existingIds = new Set(tevoEvents.map(event => event.id))
      const newRows = rows.filter(event => !existingIds.has(event.id))
      setTevoEvents(prev => [...prev, ...newRows])
      setTevoHasMore(rows.length === TEVO_PAGE_SIZE && newRows.length > 0)
      setTevoPage(prev => prev + 1)
    } catch {
      setTevoMoreError(true)
    } finally {
      setTevoLoadingMore(false)
    }
  }

  // First load: bring back the last place this device searched, if any.
  useEffect(() => {
    const saved = readStored<Place[]>(RECENTS_KEY, [])
    setRecents(saved)
    setFavorites(readStored<string[]>(FAVORITES_KEY, []))
    if (saved[0]?.zip) {
      setZipCode(saved[0].zip)
      setLocationName(placeLabel(saved[0]))
      fetchEvents(saved[0].zip)
    } else {
      fetchEvents()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // "Near <city>" suggestions for the location sheet.
  useEffect(() => {
    if (!zipCode) { setNearby([]); return }
    let cancelled = false
    fetch(`${API_URL}/vendors/geocode/nearby?zip=${zipCode}&miles=25&limit=6`)
      .then(res => (res.ok ? res.json() : []))
      .then(data => { if (!cancelled) setNearby(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setNearby([]) })
    return () => { cancelled = true }
  }, [API_URL, zipCode])

  // Search as you type.
  useEffect(() => {
    if (search === lastSearchRef.current) return
    const timer = setTimeout(() => {
      lastSearchRef.current = search
      fetchEvents(zipCode, category, radiusMiles, computeDateRange(dateFilter, selectedMonth), search)
    }, 450)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    lastSearchRef.current = search
    fetchEvents(zipCode, category, radiusMiles, computeDateRange(dateFilter, selectedMonth), search)
  }

  const matchesSearch = useCallback((ev: { title: string; city: string | null; venue_name: string | null; organizer?: string | null }) => {
    const term = search.trim().toLowerCase()
    return !term || ev.title.toLowerCase().includes(term) ||
      !!ev.city?.toLowerCase().includes(term) ||
      !!ev.venue_name?.toLowerCase().includes(term) ||
      !!ev.organizer?.toLowerCase().includes(term)
  }, [search])

  const monthLabel = dateFilter === 'month'
    ? new Date(selectedMonth + '-01T00:00:00').toLocaleString('default', { month: 'long', year: 'numeric' })
    : 'this range'

  // "EventEcos Hosted": listings created on EventEcos, soonest first.
  const feed = useMemo(() => {
    const own = events
      .filter(e => matchesDateFilter(e.event_date) && matchesSearch(e))
      .map(ev => {
        const minPrice = ev.ticket_tiers.length > 0 ? Math.min(...ev.ticket_tiers.map(t => Number(t.price))) : null
        const soldOut = ev.ticket_tiers.length > 0 && ev.ticket_tiers.every(t => t.quantity_sold >= t.quantity)
        return {
          id: `own:${ev.id}`,
          date: ev.event_date,
          time: ev.start_time,
          title: ev.title,
          venue: ev.venue_name,
          city: ev.city,
          state: ev.state,
          imageUrl: ev.image_url,
          price: soldOut ? 'Sold out' : minPrice === null ? null : minPrice === 0 ? 'Free' : `$${minPrice.toFixed(0)}`,
          priceTone: soldOut ? ('danger' as const) : ('normal' as const),
          href: `/events/${ev.id}`,
          external: false,
          badges: (
            <>
              {ev.age_restriction && (
                <span className="rounded bg-black/70 px-2 py-0.5 text-xs font-bold text-white">{ev.age_restriction}</span>
              )}
              <NonprofitBadge promoter={ev.promoter_accounts} className="bg-white/90" />
            </>
          ),
        }
      })
    return own.sort((a, b) =>
      `${a.date ?? ''}${a.time ?? ''}`.localeCompare(`${b.date ?? ''}${b.time ?? ''}`))
  }, [events, matchesDateFilter, matchesSearch])

  const filteredTevoEvents = useMemo(
    () => tevoEvents.filter(ev => matchesDateFilter(ev.event_date) && matchesSearch(ev)),
    [tevoEvents, matchesDateFilter, matchesSearch],
  )

  const filteredExtEvents = useMemo(
    () => extEvents.filter(ev => matchesDateFilter(ev.event_date) && matchesSearch(ev)),
    [extEvents, matchesDateFilter, matchesSearch],
  )

  const anyLoading = loading || extLoading || tevoLoading
  const nothingListed = feed.length === 0 && filteredExtEvents.length === 0 && filteredTevoEvents.length === 0
  const stillLoading = anyLoading && nothingListed
  const noEvents = !anyLoading && nothingListed

  return (
    <div className="min-h-screen bg-white">
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

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
        {search.trim() && (
          <p className="mb-4 text-center text-sm text-gray-500">
            Showing results for &ldquo;{search.trim()}&rdquo; in all locations.
          </p>
        )}
        {/* 1. Discover */}
        <section className="mx-auto max-w-2xl">
          <h1 className="text-center text-3xl font-bold tracking-tight text-gray-900">Find your next outing</h1>

          <div className="mt-3 flex items-center justify-center gap-3">
            <p className="flex min-w-0 items-center gap-2 text-gray-800">
              <MapPin className="h-5 w-5 shrink-0 text-gray-500" />
              <span className="truncate font-medium">{locationName || 'Choose a location'}</span>
            </p>
            <button
              type="button"
              onClick={() => setLocationSheet(true)}
              className="shrink-0 text-sm font-medium text-blue-600 underline underline-offset-2 hover:text-blue-700"
            >
              Change
            </button>
          </div>

          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-500 bg-white px-4 py-3 text-base font-medium text-blue-700 transition-colors hover:bg-blue-50 disabled:opacity-60"
          >
            {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5" />}
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          {locationError && <p role="alert" className="mt-2 text-sm text-red-600">{locationError}</p>}

          <form role="search" onSubmit={handleSearchSubmit} className="mt-4">
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-indigo-400 focus-within:bg-white">
              <Search className="h-5 w-5 shrink-0 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search events or artists"
                aria-label="Search events or artists"
                className="w-full bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none"
              />
            </label>
          </form>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button type="button" onClick={openFilterSheet} className={`${chipBase} ${chipIdle}`}>
              <MapPin className="h-4 w-4 text-gray-600" />
              {radiusMiles} miles
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>
            <button type="button" onClick={openFilterSheet} className={`${chipBase} ${category ? 'border-indigo-300 bg-indigo-50 text-indigo-800' : chipIdle}`}>
              <Tag className="h-4 w-4" />
              {category || 'Category'}
              <ChevronDown className="h-4 w-4 opacity-60" />
            </button>
          </div>

          <div className="relative mt-3">
            <div role="group" aria-label="When" className="flex items-center justify-center gap-2 overflow-x-auto pb-1">
              <button type="button" aria-pressed={dateFilter === ''} onClick={() => pickDate('')} className={`${chipBase} ${dateFilter === '' ? chipActive : chipIdle}`}>
                Anytime
              </button>
              <button type="button" aria-pressed={dateFilter === 'today'} onClick={() => pickDate('today')} className={`${chipBase} ${dateFilter === 'today' ? chipActive : chipIdle}`}>
                Today
              </button>
              <button type="button" aria-pressed={dateFilter === 'weekend'} onClick={() => pickDate('weekend')} className={`${chipBase} ${dateFilter === 'weekend' ? chipActive : chipIdle}`}>
                Weekend
              </button>
              <button
                type="button"
                data-month-picker-toggle
                aria-haspopup="dialog"
                aria-expanded={showMonthPicker}
                aria-label={dateFilter === 'month' ? `Month: ${monthLabel}. Change month` : 'Pick a month'}
                onClick={toggleMonthPicker}
                className={`${chipBase} ${dateFilter === 'month' ? chipActive : chipIdle}`}
              >
                <CalendarDays className="h-4 w-4" />
                {dateFilter === 'month' && (
                  <span>{new Date(selectedMonth + '-01T00:00:00').toLocaleString('default', { month: 'short', year: 'numeric' })}</span>
                )}
              </button>
            </div>
            {showMonthPicker && (
              <div className="absolute left-1/2 top-full z-30 mt-2 -translate-x-1/2">
                <MonthPicker
                  value={selectedMonth}
                  onClose={() => setShowMonthPicker(false)}
                  onChange={month => {
                    setSelectedMonth(month)
                    setDateFilter('month')
                    setShowMonthPicker(false)
                    fetchEvents(zipCode, category, radiusMiles, computeDateRange('month', month), search)
                  }}
                />
              </div>
            )}
          </div>
        </section>

        {/* EventEcos Hosted: events listed on EventEcos. Not shown at all when there are none. */}
        {feed.length > 0 && (
          <section className="mt-8" aria-labelledby="hosted">
            <h2 id="hosted" className="text-center text-2xl font-bold text-gray-900">EventEcos Hosted</h2>
            {zipCode && <p className="mt-0.5 text-center text-sm text-gray-500">Within {radiusMiles} miles of {cityOnly}</p>}

            <div className="mt-4 flex flex-wrap justify-center gap-5 [&>*]:w-full md:[&>*]:w-[calc(50%-0.625rem)] lg:[&>*]:w-[calc(33.333%-0.84rem)]">
              {feed.map(ev => (
                <EventListingCard
                  key={ev.id}
                  title={ev.title}
                  date={ev.date}
                  time={ev.time}
                  venue={ev.venue}
                  city={ev.city}
                  state={ev.state}
                  imageUrl={ev.imageUrl}
                  price={ev.price}
                  priceTone={ev.priceTone}
                  href={ev.href}
                  external={ev.external}
                  badges={ev.badges}
                  favorited={favorites.includes(ev.id)}
                  onToggleFavorite={() => toggleFavorite(ev.id)}
                />
              ))}
            </div>

            {!loading && platformHasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMorePlatformEvents}
                  disabled={platformLoadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-300 px-5 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                >
                  {platformLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load more events
                </button>
              </div>
            )}
            {platformMoreError && (
              <p role="alert" className="mt-2 text-center text-sm text-red-600">Could not load more events. Try again.</p>
            )}
          </section>
        )}

        {/* One message when no source has anything, a spinner while the first results load. */}
        {noEvents && (
          <div className="py-14 text-center">
            <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-xl font-semibold text-gray-600">No events found</p>
            <p className="mt-1 text-gray-400">
              {dateFilter ? `Nothing for ${dateFilter === 'month' ? monthLabel : dateFilter === 'today' ? 'today' : 'this range'}. ` : ''}
              {search.trim() ? 'Try a different spelling or fewer words.' : 'Try a bigger distance, another date, or a different place.'}
            </p>
          </div>
        )}
        {stillLoading && (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-indigo-400" /></div>
        )}

        {/* Big Events — Ticket Evolution */}
        {ENABLE_TICKET_EVOLUTION_PUBLIC_EVENTS && (tevoLoading || tevoEvents.length > 0) && (
          <section className="mt-12" aria-labelledby="big-events">
            <h2 id="big-events" className="text-center text-2xl font-bold text-gray-900">Big Events, Great Seats</h2>

            {tevoLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>
            ) : filteredTevoEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No events found for {monthLabel}.</p>
            ) : (
              <div className="mt-4 flex flex-wrap justify-center gap-5 [&>*]:w-full md:[&>*]:w-[calc(50%-0.625rem)] lg:[&>*]:w-[calc(33.333%-0.84rem)]">
                {filteredTevoEvents.map(ev => (
                  <EventListingCard
                    key={ev.id}
                    title={ev.title}
                    date={ev.event_date}
                    time={ev.start_time}
                    venue={ev.venue_name}
                    city={ev.city}
                    state={ev.state}
                    imageUrl={ev.image_url}
                    note="See seats & tickets →"
                    href={`/events/tickets/${ev.id}`}
                    placeholder="ticket"
                    favorited={favorites.includes(`tevo:${ev.id}`)}
                    onToggleFavorite={() => toggleFavorite(`tevo:${ev.id}`)}
                  />
                ))}
              </div>
            )}
            {!tevoLoading && tevoHasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMoreTevoEvents}
                  disabled={tevoLoadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-300 px-5 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                >
                  {tevoLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load more events
                </button>
              </div>
            )}
            {tevoMoreError && <p role="alert" className="mt-2 text-center text-sm text-red-600">Could not load more events. Try again.</p>}
          </section>
        )}

        {/* Events Around Town — aggregated local listings */}
        {(extLoading || extEvents.length > 0) && (
          <section className="mt-12" aria-labelledby="around-town">
            <h2 id="around-town" className="text-center text-2xl font-bold text-gray-900">Events Around Town</h2>
            <p className="mt-0.5 text-center text-sm text-gray-500">Aggregated from local event listings.</p>

            {extLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-400" /></div>
            ) : filteredExtEvents.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">No local events found for {monthLabel}.</p>
            ) : (
              <div className="mt-4 flex flex-wrap justify-center gap-5 [&>*]:w-full md:[&>*]:w-[calc(50%-0.625rem)] lg:[&>*]:w-[calc(33.333%-0.84rem)]">
                {filteredExtEvents.map(ev => (
                  <EventListingCard
                    key={ev.id}
                    title={ev.title}
                    date={ev.event_date}
                    time={ev.start_time}
                    venue={ev.venue_name}
                    city={ev.city}
                    state={ev.state}
                    imageUrl={ev.image_url}
                    price={ev.price_min === null ? null : ev.price_min === 0 ? 'Free' : `$${ev.price_min.toFixed(0)}`}
                    note={ev.price_min === null && ev.event_url ? 'See details' : undefined}
                    href={ev.event_url}
                    external
                    favorited={favorites.includes(`ext:${ev.id}`)}
                    onToggleFavorite={() => toggleFavorite(`ext:${ev.id}`)}
                  />
                ))}
              </div>
            )}
            {!extLoading && extHasMore && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={loadMoreExternalEvents}
                  disabled={extLoadingMore}
                  className="inline-flex items-center gap-2 rounded-full border border-indigo-300 px-5 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50 disabled:opacity-50"
                >
                  {extLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  Load more events
                </button>
              </div>
            )}
            {extMoreError && <p role="alert" className="mt-2 text-center text-sm text-red-600">Could not load more local events. Try again.</p>}
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
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
            <FollowUs />
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

      {/* 2. Change location */}
      <BottomSheet open={locationSheet} title="Choose your location" onClose={closeLocationSheet}>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-blue-600 disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Crosshair className="h-5 w-5" />}
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
        {locationError && <p role="alert" className="mt-2 text-sm text-red-600">{locationError}</p>}

        <div className="my-4 flex items-center gap-3 text-xs text-gray-400">
          <span className="h-px flex-1 bg-gray-200" />
          Or choose a city
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-blue-400 focus-within:bg-white">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            value={sheetQuery}
            onChange={e => onSheetQuery(e.target.value)}
            placeholder="City or ZIP code"
            aria-label="City or ZIP code"
            autoComplete="off"
            autoCapitalize="words"
            onKeyDown={e => { if (e.key === 'Enter' && sheetResults[0]) { e.preventDefault(); chooseLocation(sheetResults[0]) } }}
            className="w-full bg-transparent text-base text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          {sheetLoading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gray-400" />}
        </label>

        {sheetQuery.trim().length >= 2 ? (
          <ul className="mt-3 space-y-2">
            {sheetResults.length === 0 && !sheetLoading && (
              <li className="px-1 py-2 text-sm text-gray-500">No cities found. Check the spelling or try a ZIP code.</li>
            )}
            {sheetResults.map((p, i) => (
              <LocationRow key={`${p.zip}-${i}`} place={p} onPick={chooseLocation} />
            ))}
          </ul>
        ) : (
          <>
            {recents.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Recent locations</p>
                <ul className="space-y-2">
                  {recents.map(p => <LocationRow key={p.zip} place={p} onPick={chooseLocation} />)}
                </ul>
              </>
            )}
            {nearby.length > 0 && (
              <>
                <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500">Near {cityOnly}</p>
                <ul className="space-y-2">
                  {nearby.map(p => <LocationRow key={p.zip} place={p} onPick={chooseLocation} />)}
                </ul>
              </>
            )}
          </>
        )}
      </BottomSheet>

      {/* 3. Refine nearby */}
      <BottomSheet
        open={filterSheet}
        title="Distance & category"
        onClose={closeFilterSheet}
        footer={
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => { setPendingRadius(DEFAULT_RADIUS); setPendingCategory('') }}
              className="px-2 py-2 text-base font-semibold text-indigo-700 hover:text-indigo-900"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="flex-1 rounded-xl bg-indigo-600 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              Show events
            </button>
          </div>
        }
      >
        <p className="mt-2 text-sm font-semibold text-gray-900">
          {locationName ? `Distance from ${locationName}` : 'Distance'}
        </p>
        <div role="group" aria-label="Distance" className="mt-2 grid grid-cols-5 gap-2">
          {DISTANCES.map(d => (
            <button
              key={d}
              type="button"
              aria-pressed={pendingRadius === d}
              onClick={() => setPendingRadius(d)}
              className={`rounded-xl border px-1 py-2.5 text-sm font-medium transition-colors ${
                pendingRadius === d ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100'
              }`}
            >
              {d} mi
            </button>
          ))}
        </div>
        {!zipCode && <p className="mt-2 text-xs text-gray-500">Choose a location first so distance can be used.</p>}

        <p className="mt-6 text-sm font-semibold text-gray-900">Category</p>
        <div role="group" aria-label="Category" className="mt-2 grid grid-cols-2 gap-2">
          {[{ value: '', icon: LayoutGrid, label: 'All events' }, ...EVENT_CATEGORIES.map(c => ({ ...c, label: c.value }))].map(c => {
            const Icon = c.icon
            const selected = pendingCategory === c.value
            return (
              <button
                key={c.value || 'all'}
                type="button"
                aria-pressed={selected}
                onClick={() => setPendingCategory(c.value)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
                  selected ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-gray-200 bg-gray-50 text-gray-800 hover:bg-gray-100'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${selected ? 'text-blue-600' : 'text-gray-600'}`} />
                {c.label}
              </button>
            )
          })}
        </div>
      </BottomSheet>
    </div>
  )
}

function LocationRow({ place, onPick }: { place: Place; onPick: (p: Place) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(place)}
        className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left hover:bg-gray-100"
      >
        <MapPin className="h-5 w-5 shrink-0 text-gray-600" />
        <span className="flex-1 truncate text-base text-gray-900">{placeLabel(place)}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
      </button>
    </li>
  )
}
