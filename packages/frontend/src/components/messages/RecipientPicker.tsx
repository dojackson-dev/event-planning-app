'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'

export interface RecipientOption {
  id: string
  name: string
  phone?: string | null
  email?: string | null
}

interface Props {
  label: string
  options: RecipientOption[]
  selectedId: string
  onSelect: (option: RecipientOption | null) => void
  placeholder?: string
  emptyHint?: string
  disabled?: boolean
  required?: boolean
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
const digits = (s: string) => s.replace(/\D/g, '')

export function filterRecipients(options: RecipientOption[], query: string, limit = 8): RecipientOption[] {
  const q = norm(query)
  if (!q) return options.slice(0, limit)
  const qd = digits(q)
  const words = q.split(' ')
  return options
    .filter(o => {
      const hay = norm(`${o.name} ${o.email ?? ''}`)
      if (words.every(w => hay.includes(w))) return true
      return qd.length >= 3 && digits(o.phone ?? '').includes(qd)
    })
    .slice(0, limit)
}

/** Type-ahead search over a list of people; picking one reports it to the parent. */
export default function RecipientPicker({ label, options, selectedId, onSelect, placeholder, emptyHint, disabled, required }: Props) {
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(() => options.find(o => o.id === selectedId) ?? null, [options, selectedId])
  const matches = useMemo(() => filterRecipients(options, query), [options, query])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const choose = (o: RecipientOption) => {
    onSelect(o)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, matches.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); choose(matches[active]) }
    else if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}{required ? ' *' : ''}</label>
      {selected && !open ? (
        <div className="flex items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{selected.name}</p>
            <p className="truncate text-xs text-gray-500">{[selected.phone || 'no phone', selected.email].filter(Boolean).join(' · ')}</p>
          </div>
          {!disabled && (
            <button type="button" onClick={() => { onSelect(null); setOpen(true) }} aria-label={`Change ${label.toLowerCase()}`} className="ml-3 rounded p-1 text-gray-400 hover:text-gray-700">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <>
          <input
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            value={query}
            disabled={disabled}
            required={required && !selected}
            placeholder={placeholder ?? 'Type a name, email or phone…'}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
          />
          {open && !disabled && (
            <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
              {matches.length === 0 ? (
                <li className="px-4 py-3 text-sm text-gray-500">{options.length === 0 ? (emptyHint ?? 'Nothing to choose from yet.') : `No matches for "${query}".`}</li>
              ) : matches.map((o, i) => (
                <li
                  key={o.id}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={e => { e.preventDefault(); choose(o) }}
                  onMouseEnter={() => setActive(i)}
                  className={`cursor-pointer px-4 py-2 ${i === active ? 'bg-primary-50' : ''}`}
                >
                  <p className="text-sm font-medium text-gray-900">{o.name}</p>
                  <p className="text-xs text-gray-500">{[o.phone || 'no phone', o.email].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
