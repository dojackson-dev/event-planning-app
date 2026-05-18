'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight, X, Mic2 } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PromoterBooking {
  id: string
  event_date?: string
  artist_name?: string
}

interface PromoterEvent {
  id: string
  title: string
  event_date: string
  start_time?: string
  venue_name?: string
  city?: string
  state?: string
  status: 'draft' | 'published' | 'cancelled'
}

// ─── Color maps ───────────────────────────────────────────────────────────────

const EVENT_DOT: Record<string, string> = {
  draft:     'bg-blue-400',
  published: 'bg-green-500',
  cancelled: 'bg-gray-300',
}

const EVENT_CELL: Record<string, string> = {
  draft:     'bg-blue-50 text-blue-700',
  published: 'bg-green-50 text-green-700',
  cancelled: 'bg-gray-50 text-gray-400 line-through',
}

const EVENT_PILL: Record<string, string> = {
  draft:     'bg-blue-100 text-blue-700',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

// ─── parseLocal helper ────────────────────────────────────────────────────────

const parseLocal = (s: string) => {
  const [y, m, d] = s.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PromoterCalendarPage() {
  const [bookings, setBookings] = useState<PromoterBooking[]>([])
  const [events, setEvents]     = useState<PromoterEvent[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected] = useState<PromoterEvent | null>(null)

  useEffect(() => {
    Promise.allSettled([
      api.get('/promoter-bookings/mine'),
      api.get('/promoter-events/mine'),
    ]).then(([bRes, eRes]) => {
      if (bRes.status === 'fulfilled') setBookings(bRes.value.data || [])
      if (eRes.status === 'fulfilled') setEvents(eRes.value.data || [])
      if (bRes.status === 'rejected' && eRes.status === 'rejected') {
        setError('Failed to load calendar data')
      }
    }).finally(() => setLoading(false))
  }, [])

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsOnDay = (day: Date) =>
    events.filter(ev => isSameDay(parseLocal(ev.event_date), day))

  const artistBookedOnDay = (day: Date) =>
    bookings.some(b => b.event_date && b.artist_name && isSameDay(parseLocal(b.event_date), day))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Title row */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-5 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-1">Your events at a glance</p>
        </div>
      </div>

      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center">
          <Link href="/dashboard/promoter" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
        </div>
      </nav>

      <div className="p-6 max-w-5xl mx-auto">

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="bg-white rounded-xl shadow-sm p-5">
        {/* Month header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">{format(currentDate, 'MMMM yyyy')}</h2>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentDate(d => subMonths(d, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentDate(d => addMonths(d, 1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 border-l border-t border-gray-100">
          {days.map(day => {
            const dayEvents = eventsOnDay(day)
            const hasArtist = artistBookedOnDay(day)
            const inMonth   = isSameMonth(day, currentDate)
            const today     = isToday(day)
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[72px] border-r border-b border-gray-100 p-1 ${inMonth ? 'bg-white' : 'bg-gray-50'}`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full ${
                    today   ? 'bg-purple-600 text-white' :
                    inMonth ? 'text-gray-700'            :
                              'text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {hasArtist && inMonth && (
                    <Mic2 className="w-3 h-3 text-purple-400 flex-shrink-0" />
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((ev, i) => (
                    <button
                      key={`${ev.id}-${i}`}
                      onClick={() => setSelected(ev)}
                      className={`w-full text-left truncate text-xs px-1 py-0.5 rounded font-medium flex items-center gap-1 ${
                        EVENT_CELL[ev.status] || 'bg-gray-50 text-gray-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${EVENT_DOT[ev.status]}`} />
                      <span className="truncate">{ev.title}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-xs text-gray-400 pl-1">+{dayEvents.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 flex-wrap text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />Published
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400" />Draft
          </div>
          <div className="flex items-center gap-1.5">
            <Mic2 className="w-3 h-3 text-purple-400" />Artist Booked
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-1">
              <span className={`text-xs font-semibold uppercase tracking-wide ${
                selected.status === 'published' ? 'text-green-600' : 'text-blue-600'
              }`}>Event</span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-4">{selected.title}</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-700">📅 Date: </span>
                {parseLocal(selected.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {selected.start_time && (
                <p><span className="font-medium text-gray-700">🕐 Time: </span>{selected.start_time}</p>
              )}
              {selected.venue_name && (
                <p><span className="font-medium text-gray-700">📍 Venue: </span>{selected.venue_name}</p>
              )}
              {(selected.city || selected.state) && (
                <p><span className="font-medium text-gray-700">🏙️ City: </span>
                  {[selected.city, selected.state].filter(Boolean).join(', ')}
                </p>
              )}
              <p>
                <span className="font-medium text-gray-700">Status: </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_PILL[selected.status] || 'bg-gray-100 text-gray-600'}`}>
                  {selected.status}
                </span>
              </p>
              {artistBookedOnDay(parseLocal(selected.event_date)) && (
                <p className="flex items-center gap-1.5 text-purple-600 font-medium">
                  <Mic2 className="w-4 h-4" />Artist booked for this date
                </p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link href="/dashboard/promoter/events" className="text-sm text-green-600 hover:underline" onClick={() => setSelected(null)}>
                View all events →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
  )
}
