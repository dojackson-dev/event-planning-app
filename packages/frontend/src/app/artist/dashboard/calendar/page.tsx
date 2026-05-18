'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ChevronLeft, ChevronRight, X, LogOut } from 'lucide-react'
import RoleSwitcher from '@/components/RoleSwitcher'
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

interface ArtistBooking {
  id: string
  event_name: string
  client_name: string
  client_email: string
  event_date?: string
  event_start_time?: string
  venue_name?: string
  agreed_amount?: number
  deposit_amount?: number
  status: 'inquiry' | 'estimate_sent' | 'deposit_paid' | 'confirmed' | 'completed' | 'cancelled'
  notes?: string
}

const STATUS_DOT: Record<string, string> = {
  inquiry:       'bg-gray-400',
  estimate_sent: 'bg-blue-400',
  deposit_paid:  'bg-yellow-400',
  confirmed:     'bg-green-500',
  completed:     'bg-purple-500',
  cancelled:     'bg-red-400',
}

const STATUS_PILL: Record<string, string> = {
  inquiry:       'bg-gray-100 text-gray-700',
  estimate_sent: 'bg-blue-100 text-blue-700',
  deposit_paid:  'bg-yellow-100 text-yellow-700',
  confirmed:     'bg-green-100 text-green-700',
  completed:     'bg-purple-100 text-purple-700',
  cancelled:     'bg-red-100 text-red-600',
}

const STATUS_CELL: Record<string, string> = {
  inquiry:       'bg-gray-50 text-gray-600',
  estimate_sent: 'bg-blue-50 text-blue-700',
  deposit_paid:  'bg-yellow-50 text-yellow-700',
  confirmed:     'bg-green-50 text-green-700',
  completed:     'bg-purple-50 text-purple-700',
  cancelled:     'bg-red-50 text-red-500',
}

const STATUS_LABELS: Record<string, string> = {
  inquiry:       'Inquiry',
  estimate_sent: 'Estimate Sent',
  deposit_paid:  'Deposit Paid',
  confirmed:     'Confirmed',
  completed:     'Completed',
  cancelled:     'Cancelled',
}

const parseLocal = (s: string) => {
  const [y, m, d] = s.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function ArtistCalendarPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<ArtistBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected] = useState<ArtistBooking | null>(null)

  const handleLogout = () => {
    ;['access_token','refresh_token','user_role','user_roles','active_role'].forEach(k => localStorage.removeItem(k))
    router.push('/artist/login')
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/artist/login'); return }

    api.get('/artist-bookings/mine')
      .then(r => setBookings(r.data || []))
      .catch(e => {
        if (e.response?.status === 401) router.replace('/artist/login')
        else setError('Failed to load bookings')
      })
      .finally(() => setLoading(false))
  }, [router])

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const bookingsOnDay = (day: Date) =>
    bookings.filter(b => b.event_date && isSameDay(parseLocal(b.event_date), day))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/artist/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
          <span className="text-sm font-semibold text-gray-800">Calendar</span>
        </div>
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 h-11 flex items-center gap-2">
            <RoleSwitcher variant="banner" />
            <div className="flex-1" />
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors">
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-6">
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
              const dayBookings = bookingsOnDay(day)
              const inMonth = isSameMonth(day, currentDate)
              const today   = isToday(day)
              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[72px] border-r border-b border-gray-100 p-1 ${inMonth ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full mb-0.5 ${
                    today        ? 'bg-blue-600 text-white' :
                    inMonth      ? 'text-gray-700'          :
                                   'text-gray-300'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map(b => (
                      <button
                        key={b.id}
                        onClick={() => setSelected(b)}
                        className={`w-full text-left truncate text-xs px-1 py-0.5 rounded font-medium flex items-center gap-1 ${STATUS_CELL[b.status] || 'bg-gray-100 text-gray-500'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[b.status] || 'bg-gray-400'}`} />
                        <span className="truncate">{b.event_name}</span>
                      </button>
                    ))}
                    {dayBookings.length > 3 && (
                      <p className="text-xs text-gray-400 pl-1">+{dayBookings.length - 3} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex gap-4 mt-4 flex-wrap">
            {[
              { label: 'Inquiry',       color: 'bg-gray-400'   },
              { label: 'Estimate Sent', color: 'bg-blue-400'   },
              { label: 'Deposit Paid',  color: 'bg-yellow-400' },
              { label: 'Confirmed',     color: 'bg-green-500'  },
              { label: 'Completed',     color: 'bg-purple-500' },
              { label: 'Cancelled',     color: 'bg-red-400'    },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className={`w-2 h-2 rounded-full ${l.color}`} />
                {l.label}
              </div>
            ))}
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
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg leading-snug">{selected.event_name}</h3>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              {selected.event_date && (
                <p>
                  <span className="font-medium text-gray-700">📅 Date: </span>
                  {parseLocal(selected.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              {selected.event_start_time && (
                <p><span className="font-medium text-gray-700">🕐 Time: </span>{selected.event_start_time}</p>
              )}
              {selected.venue_name && (
                <p><span className="font-medium text-gray-700">📍 Venue: </span>{selected.venue_name}</p>
              )}
              <p><span className="font-medium text-gray-700">👤 Client: </span>{selected.client_name}</p>
              {selected.agreed_amount != null && (
                <p><span className="font-medium text-gray-700">💰 Fee: </span>${selected.agreed_amount.toLocaleString()}</p>
              )}
              {selected.notes && (
                <p className="italic text-gray-500">"{selected.notes}"</p>
              )}
              <p>
                <span className="font-medium text-gray-700">Status: </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_PILL[selected.status] || 'bg-gray-100 text-gray-600'}`}>
                  {STATUS_LABELS[selected.status] || selected.status}
                </span>
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href="/artist/dashboard/bookings"
                className="text-sm text-blue-600 hover:underline"
                onClick={() => setSelected(null)}
              >
                View all bookings →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
