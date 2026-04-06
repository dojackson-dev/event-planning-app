'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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
import type { Booking } from '@/lib/vendorTypes'

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  declined:  'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-600',
  completed: 'bg-blue-100 text-blue-700',
  paid:      'bg-emerald-100 text-emerald-700',
}

const BOOKING_STATUS_DOT: Record<string, string> = {
  pending:   'bg-yellow-400',
  confirmed: 'bg-green-500',
  completed: 'bg-blue-500',
  declined:  'bg-red-400',
  cancelled: 'bg-gray-400',
}

const parseLocal = (s: string) => {
  const [y, m, d] = s.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function VendorCalendarTab({ bookings }: { bookings: Booking[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selected, setSelected] = useState<Booking | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd   = endOfMonth(currentDate)
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 0 })
  const days       = eachDayOfInterval({ start: calStart, end: calEnd })

  const bookingsOnDay = (day: Date) =>
    bookings.filter(b => isSameDay(parseLocal(b.event_date), day))

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
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

      {/* Calendar grid */}
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
                today
                  ? 'bg-primary-600 text-white'
                  : inMonth ? 'text-gray-700' : 'text-gray-300'
              }`}>
                {format(day, 'd')}
              </span>
              <div className="space-y-0.5">
                {dayBookings.slice(0, 3).map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelected(b)}
                    className={`w-full text-left truncate text-xs px-1 py-0.5 rounded font-medium flex items-center gap-1 ${
                      b.status === 'pending'   ? 'bg-yellow-50 text-yellow-700' :
                      b.status === 'confirmed' ? 'bg-green-50 text-green-700'  :
                      b.status === 'completed' ? 'bg-blue-50 text-blue-600'    :
                      'bg-gray-100 text-gray-500'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${BOOKING_STATUS_DOT[b.status] || 'bg-gray-400'}`} />
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
          { label: 'Pending',   color: 'bg-yellow-400' },
          { label: 'Confirmed', color: 'bg-green-500'  },
          { label: 'Completed', color: 'bg-blue-500'   },
          { label: 'Declined',  color: 'bg-red-400'    },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`w-2 h-2 rounded-full ${l.color}`} />
            {l.label}
          </div>
        ))}
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
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0">✕</button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-700">📅 Date: </span>
                {parseLocal(selected.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              {(selected.start_time || selected.end_time) && (
                <p>
                  <span className="font-medium text-gray-700">🕐 Time: </span>
                  {[selected.start_time, selected.end_time].filter(Boolean).join(' – ')}
                </p>
              )}
              {selected.venue_name && (
                <p><span className="font-medium text-gray-700">📍 Venue: </span>{selected.venue_name}</p>
              )}
              {selected.agreed_amount != null && (
                <p><span className="font-medium text-gray-700">💰 Amount: </span>${selected.agreed_amount.toLocaleString()}</p>
              )}
              {selected.notes && (
                <p className="italic text-gray-500">"{selected.notes}"</p>
              )}
              <p>
                <span className="font-medium text-gray-700">Status: </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selected.status] || 'bg-gray-100 text-gray-600'}`}>
                  {selected.status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
