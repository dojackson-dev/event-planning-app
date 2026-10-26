'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS_AHEAD = 3

interface Props {
  /** Selected month as YYYY-MM. */
  value: string
  onChange: (month: string) => void
  onClose: () => void
  /** Earliest month that can be picked, YYYY-MM. Defaults to the current month. */
  minMonth?: string
}

const toKey = (year: number, monthIndex: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`

/** Dropdown calendar for choosing a future month: a year switcher over a 12-month grid. */
export default function MonthPicker({ value, onChange, onClose, minMonth }: Props) {
  const now = new Date()
  const min = minMonth ?? toKey(now.getFullYear(), now.getMonth())
  const minYear = Number(min.slice(0, 4))
  const maxYear = minYear + YEARS_AHEAD
  const [year, setYear] = useState(() => Math.min(Math.max(Number(value.slice(0, 4)) || minYear, minYear), maxYear))
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement
      // The button that opens the picker handles its own toggle.
      if (target.closest?.('[data-month-picker-toggle]')) return
      if (!wrapRef.current?.contains(target)) onClose()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      ref={wrapRef}
      role="dialog"
      aria-label="Choose a month"
      className="w-72 rounded-xl bg-white p-3 text-gray-800 shadow-xl ring-1 ring-black/10"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setYear(y => y - 1)}
          disabled={year <= minYear}
          aria-label="Previous year"
          className="rounded-full p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold" aria-live="polite">{year}</span>
        <button
          type="button"
          onClick={() => setYear(y => y + 1)}
          disabled={year >= maxYear}
          aria-label="Next year"
          className="rounded-full p-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {MONTHS.map((label, i) => {
          const key = toKey(year, i)
          const disabled = key < min
          const selected = key === value
          const current = key === toKey(now.getFullYear(), now.getMonth())
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              aria-label={`${new Date(year, i, 1).toLocaleString('en-US', { month: 'long' })} ${year}`}
              onClick={() => onChange(key)}
              className={`rounded-lg px-2 py-2.5 text-sm font-medium transition-colors ${
                selected
                  ? 'bg-blue-600 text-white'
                  : disabled
                  ? 'cursor-not-allowed text-gray-300'
                  : current
                  ? 'border border-blue-300 text-blue-700 hover:bg-blue-50'
                  : 'hover:bg-gray-100'
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
