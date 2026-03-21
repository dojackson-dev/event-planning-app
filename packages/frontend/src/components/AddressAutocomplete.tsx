'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Suggestion {
  displayName: string
  city: string
  state: string
  zip: string
  lat: number
  lng: number
}

interface Props {
  value: string
  onChange: (value: string) => void
  onSelect: (fields: { address: string; city: string; state: string; zip: string; lat: number; lng: number }) => void
  placeholder?: string
  className?: string
  required?: boolean
}

export default function AddressAutocomplete({ value, onChange, onSelect, placeholder = 'Street address', className, required }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 4) {
      setSuggestions([])
      setOpen(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/vendors/geocode/autocomplete?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data: Suggestion[] = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      }
    } catch {
      // silently fail — user can still type manually
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 400)
  }

  const handleSelect = (s: Suggestion) => {
    // Use the first line of displayName (the street/place part) as the address value
    const shortAddress = s.displayName.split(',').slice(0, 2).join(',').trim()
    onChange(shortAddress)
    onSelect({ address: shortAddress, city: s.city, state: s.state, zip: s.zip, lat: s.lat, lng: s.lng })
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          required={required}
          suppressHydrationWarning
          className={className ?? 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500'}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onMouseDown={() => handleSelect(s)}
                className="w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-primary-50 transition-colors"
              >
                <MapPin className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-900 leading-snug line-clamp-1">{s.displayName.split(',').slice(0, 2).join(',')}</p>
                  <p className="text-xs text-gray-500">{[s.city, s.state, s.zip].filter(Boolean).join(', ')}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
