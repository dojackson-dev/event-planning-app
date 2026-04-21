'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import {
  Plus, Loader2, Calendar, List, MapPin, Clock,
  Tag, ExternalLink, ChevronLeft, ChevronRight,
  Ticket, Users,
} from 'lucide-react'

interface TicketTier {
  id: string
  name: string
  price: number
  quantity: number
  quantity_sold: number
}

interface PromoterEvent {
  id: string
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  end_time: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  category: string | null
  status: 'draft' | 'published' | 'cancelled'
  ticket_tiers: TicketTier[]
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function PromoterEventsPage() {
  const [events, setEvents] = useState<PromoterEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  useEffect(() => {
    api.get('/promoter-events/mine')
      .then(r => setEvents(r.data || []))
      .catch(e => setError(e.response?.data?.message || 'Failed to load events'))
      .finally(() => setLoading(false))
  }, [])

  const totalTickets = events.reduce((s, e) => s + e.ticket_tiers.reduce((ts, t) => ts + t.quantity_sold, 0), 0)
  const published = events.filter(e => e.status === 'published').length

  // Calendar helpers
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']

  function eventsOnDay(day: number) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return events.filter(e => e.event_date === dateStr)
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/promoter" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <span className="text-sm font-semibold text-gray-800">My Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border border-gray-200 rounded-lg overflow-hidden">
              <button onClick={() => setView('list')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${view === 'list' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button onClick={() => setView('calendar')}
                className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1 ${view === 'calendar' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Calendar className="w-3.5 h-3.5" /> Calendar
              </button>
            </div>
            <Link href="/dashboard/promoter/events/new"
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
              <Plus className="w-4 h-4" /> New Event
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Total Events</p>
            <p className="text-2xl font-bold text-gray-900">{events.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Published</p>
            <p className="text-2xl font-bold text-green-600">{published}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase font-medium mb-1">Tickets Sold</p>
            <p className="text-2xl font-bold text-purple-600">{totalTickets}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-purple-500" /></div>
        ) : view === 'list' ? (
          // ── LIST VIEW ──
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No events yet</p>
                <p className="text-sm text-gray-400 mt-1">Create your first event to start selling tickets</p>
                <Link href="/dashboard/promoter/events/new"
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                  <Plus className="w-4 h-4" /> Create Event
                </Link>
              </div>
            ) : events.map(ev => {
              const tiersSold = ev.ticket_tiers.reduce((s, t) => s + t.quantity_sold, 0)
              const tiersTotal = ev.ticket_tiers.reduce((s, t) => s + t.quantity, 0)
              const dateObj = new Date(ev.event_date + 'T00:00:00')
              return (
                <Link key={ev.id} href={`/dashboard/promoter/events/${ev.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      {/* Date badge */}
                      <div className="text-center bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 min-w-[52px]">
                        <p className="text-xs font-medium text-purple-500 uppercase">
                          {dateObj.toLocaleString('default', { month: 'short' })}
                        </p>
                        <p className="text-xl font-bold text-purple-700 leading-none">{dateObj.getDate()}</p>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{ev.title}</h3>
                        <div className="flex flex-wrap gap-3 mt-1">
                          {(ev.city || ev.venue_name) && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              {ev.venue_name ? `${ev.venue_name}${ev.city ? ', ' + ev.city : ''}` : ev.city}
                            </span>
                          )}
                          {ev.start_time && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" /> {ev.start_time}
                            </span>
                          )}
                          {ev.category && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Tag className="w-3 h-3" /> {ev.category}
                            </span>
                          )}
                        </div>
                        {ev.ticket_tiers.length > 0 && (
                          <div className="flex items-center gap-3 mt-2">
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <Ticket className="w-3 h-3 text-purple-400" />
                              {tiersSold}/{tiersTotal} sold
                            </span>
                            <span className="flex items-center gap-1 text-xs text-gray-600">
                              <Users className="w-3 h-3 text-blue-400" />
                              {ev.ticket_tiers.length} tier{ev.ticket_tiers.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[ev.status]}`}>
                        {ev.status}
                      </span>
                      {ev.status === 'published' && (
                        <a href={`/events/${ev.id}`} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-gray-400 hover:text-purple-500">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          // ── CALENDAR VIEW ──
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-sm font-semibold text-gray-900">{monthNames[calMonth]} {calYear}</h3>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 py-2 border-b">{d}</div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="border-b border-r border-gray-100 min-h-[80px]" />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dayEvents = eventsOnDay(day)
                const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
                return (
                  <div key={day} className="border-b border-r border-gray-100 min-h-[80px] p-1.5">
                    <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                      isToday ? 'bg-purple-600 text-white' : 'text-gray-600'
                    }`}>{day}</div>
                    {dayEvents.map(e => (
                      <Link key={e.id} href={`/dashboard/promoter/events/${e.id}`}
                        className={`block text-xs truncate px-1 py-0.5 rounded mb-0.5 font-medium ${
                          e.status === 'published' ? 'bg-purple-100 text-purple-700' :
                          e.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                        {e.title}
                      </Link>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
