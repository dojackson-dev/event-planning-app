'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { PlaceHit, placeLabel, searchPlaces } from '@/lib/places'

interface Props {
  value: string
  onChange: (text: string) => void
  onSelect: (place: PlaceHit) => void
  placeholder?: string
  ariaLabel?: string
  /** Classes for the text box itself. */
  inputClassName?: string
  autoFocus?: boolean
}

const DEBOUNCE_MS = 150

/** A text box that suggests cities while you type; pick one (click, or arrow keys + Enter) to get its zip code. */
export default function CityAutocomplete({
  value, onChange, onSelect, placeholder = 'City or ZIP code', ariaLabel = 'City or ZIP code', inputClassName = '', autoFocus,
}: Props) {
  const listId = useId()
  const [hits, setHits] = useState<PlaceHit[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const typedRef = useRef(false)

  // Only look things up after the person typed, not when a pick or "Use my location" fills the box.
  useEffect(() => {
    if (!typedRef.current) return
    const q = value.trim()
    if (q.length < 2) { setHits([]); setOpen(false); setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const found = await searchPlaces(q, controller.signal)
        setHits(found)
        setActive(found.length > 0 ? 0 : -1)
        setOpen(true)
      } catch {
        // aborted or offline: keep whatever is showing
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => { clearTimeout(timer); controller.abort() }
  }, [value])

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [])

  const pick = (place: PlaceHit) => {
    typedRef.current = false
    setOpen(false)
    setHits([])
    onSelect(place)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && hits.length > 0) {
      e.preventDefault(); setOpen(true); setActive(a => (a + 1) % hits.length)
    } else if (e.key === 'ArrowUp' && hits.length > 0) {
      e.preventDefault(); setOpen(true); setActive(a => (a <= 0 ? hits.length - 1 : a - 1))
    } else if (e.key === 'Enter' && open && active >= 0 && hits[active]) {
      e.preventDefault(); pick(hits[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <input
        type="text"
        role="combobox"
        aria-expanded={open && hits.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        autoCapitalize="words"
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={e => { typedRef.current = true; onChange(e.target.value) }}
        onFocus={() => { if (hits.length > 0) setOpen(true) }}
        onKeyDown={onKeyDown}
        className={`w-full min-w-0 ${inputClassName}`}
      />
      {loading && <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />}
      {open && value.trim().length >= 2 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white py-1 text-left shadow-xl"
        >
          {hits.length === 0 && !loading ? (
            <li className="px-4 py-3 text-sm text-gray-500">No cities found. Check the spelling or try a ZIP code.</li>
          ) : hits.map((h, i) => (
            <li
              key={`${h.city}-${h.state}-${h.zip}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={e => { e.preventDefault(); pick(h) }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 ${i === active ? 'bg-gray-100' : ''}`}
            >
              <MapPin className="h-4 w-4 shrink-0 text-gray-500" />
              <span className="flex-1 truncate text-base text-gray-900">{placeLabel(h)}</span>
              <span className="shrink-0 text-xs text-gray-400">{h.zip}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
