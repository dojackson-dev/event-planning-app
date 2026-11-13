'use client'

import { useEffect, useRef, useState } from 'react'
import api from '@/lib/api'
import { Building2, Search, X } from 'lucide-react'

export interface VenueOption {
  id: string
  business_name: string
  logo_url?: string | null
}

interface Props {
  selected: VenueOption | null
  onSelect: (venue: VenueOption | null) => void
}

/** Pick the venue to invoice: venues the vendor already works with, or search by business name. */
export default function VenueOwnerPicker({ selected, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<VenueOption[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const latest = useRef(0)

  useEffect(() => {
    if (selected) return
    const ticket = ++latest.current
    const timer = setTimeout(() => {
      setLoading(true)
      setFailed(false)
      api.get('/vendor-invoices/venue-owners', { params: { q: query.trim() || undefined } })
        .then(res => { if (ticket === latest.current) setResults(Array.isArray(res.data) ? res.data : []) })
        .catch(() => { if (ticket === latest.current) { setResults([]); setFailed(true) } })
        .finally(() => { if (ticket === latest.current) setLoading(false) })
    }, query.trim() ? 250 : 0)
    return () => clearTimeout(timer)
  }, [query, selected])

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50/50 px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <Building2 className="w-4 h-4 text-primary-600" /> {selected.business_name}
        </span>
        <button
          type="button"
          onClick={() => { onSelect(null); setQuery('') }}
          aria-label="Choose a different venue"
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  const searching = query.trim().length >= 2

  return (
    <div>
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search venues by name…"
          aria-label="Search venues"
          className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Searching…</p>
      ) : failed ? (
        <p className="text-xs text-red-600">We could not load venues. Check your connection and try again.</p>
      ) : results.length === 0 ? (
        <p className="text-xs text-gray-500">
          {searching ? 'No venue matches that name. Check the spelling, or invoice them as a client instead.' : 'Type at least two letters of the venue name.'}
        </p>
      ) : (
        <ul className="rounded-lg border border-gray-200 divide-y divide-gray-100 bg-white max-h-56 overflow-y-auto">
          {!searching && <li className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">Venues you work with</li>}
          {results.map(venue => (
            <li key={venue.id}>
              <button
                type="button"
                onClick={() => onSelect(venue)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                <Building2 className="w-4 h-4 text-gray-400" /> {venue.business_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
