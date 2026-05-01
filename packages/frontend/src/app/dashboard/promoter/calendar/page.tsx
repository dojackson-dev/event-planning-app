'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
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
  event_name: string
  client_name: string
  event_date?: string
  event_start_time?: string
  venue_name?: string
  agreed_amount?: number
  status: 'inquiry' | 'estimate_sent' | 'deposit_paid' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
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

type CalEntry =
  | { kind: 'booking'; data: PromoterBooking; date: Date }
  | { kind: 'event';   data: PromoterEvent;   date: Date }

// ─── Color maps ───────────────────────────────────────────────────────────────

const BOOKING_DOT: Record<string, string> = {
  inquiry:       'bg-gray-400',
  estimate_sent: 'bg-blue-400',
  deposit_paid:  'bg-yellow-400',
  confirmed:     'bg-green-500',
  completed:     'bg-emerald-500',
  cancelled:     'bg-red-400',
}

const BOOKING_CELL: Record<string, string> = {
  inquiry:       'bg-gray-50 text-gray-600',
  estimate_sent: 'bg-blue-50 text-blue-700',
  deposit_paid:  'bg-yellow-50 text-yellow-700',
  confirmed:     'bg-green-50 text-green-700',
  completed:     'bg-emerald-50 text-emerald-700',
  cancelled:     'bg-red-50 text-red-500',
}

const BOOKING_PILL: Record<string, string> = {
  inquiry:       'bg-gray-100 text-gray-700',
  estimate_sent: 'bg-blue-100 text-blue-700',
  deposit_paid:  'bg-yellow-100 text-yellow-700',
  confirmed:     'bg-green-100 text-green-700',
  completed:     'bg-emerald-100 text-emerald-700',
  cancelled:     'bg-red-100 text-red-600',
}

const BOOKING_LABELS: Record<string, string> = {
  inquiry: 'Inquiry', estimate_sent: 'Estimate Sent', deposit_paid: 'Deposit Paid',
  confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled',
}

const EVENT_DOT: Record<string, string> = {
  draft:     'bg-purple-300',
  published: 'bg-purple-600',
  cancelled: 'bg-purple-200',
}

const EVENT_CELL: Record<string, string> = {
  draft:     'bg-purple-50 text-purple-500',
  published: 'bg-purple-100 text-purple-700',
  cancelled: 'bg-purple-50 text-purple-300 line-through',
}

const EVENT_PILL: Record<string, string> = {
  draft:     'bg-purple-100 text-purple-600',
  published: 'bg-purple-200 text-purple-800',
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
  const [selected, setSelected] = useState<CalEntry | null>(null)

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

  const entriesOnDay = (day: Date): CalEntry[] => {
    const b: CalEntry[] = bookings
      .filter(b => b.event_date && isSameDay(parseLocal(b.event_date), day))
      .map(data => ({ kind: 'booking', data, date: parseLocal(data.event_date!) }))
    const e: CalEntry[] = events
      .filter(ev => isSameDay(parseLocal(ev.event_date), day))
      .map(data => ({ kind: 'event', data, date: parseLocal(data.event_date) }))
    return [...e, ...b]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-500" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">Your events and bookings in one view</p>
      </div>

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
            const entries = entriesOnDay(day)
            const inMonth = isSameMonth(day, currentDate)
            const today   = isToday(day)
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[72px] border-r border-b border-gray-100 p-1 ${inMonth ? 'bg-white' : 'bg-gray-50'}`}
              >
                <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-0.5 ${
                  today   ? 'bg-purple-600 text-white' :
                  inMonth ? 'text-gray-700'            :
                            'text-gray-300'
                }`}>
                  {format(day, 'd')}
                </span>
                <div className="space-y-0.5">
                  {entries.slice(0, 3).map((entry, i) => (
                    <button
                      key={`${entry.kind}-${entry.data.id}-${i}`}
                      onClick={() => setSelected(entry)}
                      className={`w-full text-left truncate text-xs px-1 py-0.5 rounded font-medium flex items-center gap-1 ${
                        entry.kind === 'event'
                          ? EVENT_CELL[(entry.data as PromoterEvent).status] || 'bg-purple-50 text-purple-600'
                          : BOOKING_CELL[(entry.data as PromoterBooking).status] || 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        entry.kind === 'event'
                          ? EVENT_DOT[(entry.data as PromoterEvent).status]
                          : BOOKING_DOT[(entry.data as PromoterBooking).status]
                      }`} />
                      <span className="truncate">
                        {entry.kind === 'event' ? (entry.data as PromoterEvent).title : (entry.data as PromoterBooking).event_name}
                      </span>
                    </button>
                  ))}
                  {entries.length > 3 && (
                    <p className="text-xs text-gray-400 pl-1">+{entries.length - 3} more</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">Events:</div>
          {[
            { label: 'Published', color: 'bg-purple-600' },
            { label: 'Draft',     color: 'bg-purple-300' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${l.color}`} />{l.label}
            </div>
          ))}
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">Bookings:</div>
          {[
            { label: 'Confirmed',  color: 'bg-green-500' },
            { label: 'Dep. Paid',  color: 'bg-yellow-400' },
            { label: 'Est. Sent',  color: 'bg-blue-400' },
            { label: 'Inquiry',    color: 'bg-gray-400' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className={`w-2 h-2 rounded-full ${l.color}`} />{l.label}
            </div>
          ))}
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
            {selected.kind === 'event' ? (
              <>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Event</span>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-4">{(selected.data as PromoterEvent).title}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium text-gray-700">📅 Date: </span>
                    {parseLocal((selected.data as PromoterEvent).event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {(selected.data as PromoterEvent).start_time && (
                    <p><span className="font-medium text-gray-700">🕐 Time: </span>{(selected.data as PromoterEvent).start_time}</p>
                  )}
                  {(selected.data as PromoterEvent).venue_name && (
                    <p><span className="font-medium text-gray-700">📍 Venue: </span>{(selected.data as PromoterEvent).venue_name}</p>
                  )}
                  {((selected.data as PromoterEvent).city || (selected.data as PromoterEvent).state) && (
                    <p><span className="font-medium text-gray-700">🏙️ City: </span>
                      {[(selected.data as PromoterEvent).city, (selected.data as PromoterEvent).state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p>
                    <span className="font-medium text-gray-700">Status: </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${EVENT_PILL[(selected.data as PromoterEvent).status] || 'bg-gray-100 text-gray-600'}`}>
                      {(selected.data as PromoterEvent).status}
                    </span>
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link href="/dashboard/promoter/events" className="text-sm text-purple-600 hover:underline" onClick={() => setSelected(null)}>
                    View all events →
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start justify-between mb-1">
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Booking</span>
                  <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-4">{(selected.data as PromoterBooking).event_name}</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  {(selected.data as PromoterBooking).event_date && (
                    <p>
                      <span className="font-medium text-gray-700">📅 Date: </span>
                      {parseLocal((selected.data as PromoterBooking).event_date!).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                  {(selected.data as PromoterBooking).event_start_time && (
                    <p><span className="font-medium text-gray-700">🕐 Time: </span>{(selected.data as PromoterBooking).event_start_time}</p>
                  )}
                  {(selected.data as PromoterBooking).venue_name && (
                    <p><span className="font-medium text-gray-700">📍 Venue: </span>{(selected.data as PromoterBooking).venue_name}</p>
                  )}
                  <p><span className="font-medium text-gray-700">👤 Client: </span>{(selected.data as PromoterBooking).client_name}</p>
                  {(selected.data as PromoterBooking).artist_name && (
                    <p><span className="font-medium text-gray-700">🎤 Artist: </span>{(selected.data as PromoterBooking).artist_name}</p>
                  )}
                  {(selected.data as PromoterBooking).agreed_amount != null && (
                    <p><span className="font-medium text-gray-700">💰 Amount: </span>${(selected.data as PromoterBooking).agreed_amount!.toLocaleString()}</p>
                  )}
                  {(selected.data as PromoterBooking).notes && (
                    <p className="italic text-gray-500">"{(selected.data as PromoterBooking).notes}"</p>
                  )}
                  <p>
                    <span className="font-medium text-gray-700">Status: </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${BOOKING_PILL[(selected.data as PromoterBooking).status] || 'bg-gray-100 text-gray-600'}`}>
                      {BOOKING_LABELS[(selected.data as PromoterBooking).status] || (selected.data as PromoterBooking).status}
                    </span>
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link href="/dashboard/promoter/bookings" className="text-sm text-blue-600 hover:underline" onClick={() => setSelected(null)}>
                    View all bookings →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
