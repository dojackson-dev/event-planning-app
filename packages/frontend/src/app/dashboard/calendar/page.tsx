'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Event } from '@/types'
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
  addWeeks,
  subWeeks
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange } from 'lucide-react'

type ViewType = 'month' | 'week'

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('month')
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [currentDate])

  const fetchEvents = async () => {
    try {
      const response = await api.get<Event[]>('/events')
      setEvents(response.data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  // Month view calculations
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  // For month view, we need to show the full calendar grid starting from Sunday
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Week view calculations
  const weekStart = startOfWeek(currentDate)
  const weekEnd = endOfWeek(currentDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const displayDays = viewType === 'month' ? monthDays : weekDays

  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.date), day))
  }

  const previousPeriod = () => {
    if (viewType === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const nextPeriod = () => {
    if (viewType === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const getHeaderText = () => {
    if (viewType === 'month') {
      return format(currentDate, 'MMMM yyyy')
    } else {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
  }

  if (loading) {
    return <div>Loading calendar...</div>
  }

  return (
    <div>
      <div className="mb-6">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Calendar</h1>
        
        {/* View Toggle - Centered */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setViewType('month')}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewType === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Month
            </button>
            <button
              onClick={() => setViewType('week')}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewType === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CalendarRange className="h-4 w-4 mr-1.5" />
              Week
            </button>
          </div>
        </div>
        
        {/* Date Navigation - Centered */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={previousPeriod}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold px-3 min-w-[220px] text-center">
              {getHeaderText()}
            </h2>
            <button
              onClick={nextPeriod}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="bg-gray-50 p-3 text-center text-sm font-semibold text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {displayDays.map((day, index) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentDay = isToday(day)
            const isCurrentMonth = viewType === 'week' || isSameMonth(day, currentDate)

            return (
              <div
                key={index}
                className={`bg-white p-2 ${
                  viewType === 'month' ? 'min-h-[120px]' : 'min-h-[150px]'
                } ${!isCurrentMonth ? 'bg-gray-50' : ''}`}
              >
                <div className="flex flex-col h-full">
                  <div
                    className={`text-sm font-semibold mb-2 ${
                      isCurrentDay
                        ? 'bg-primary-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
                        : 'text-gray-900'
                    }`}
                  >
                    {viewType === 'week' ? format(day, 'EEE d') : format(day, 'd')}
                  </div>
                  <div className="space-y-1 flex-1 overflow-y-auto">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1.5 rounded truncate cursor-pointer hover:opacity-80 transition-opacity ${
                          event.status === 'scheduled'
                            ? 'bg-green-100 text-green-800'
                            : event.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                        title={`${event.name} - ${event.startTime}`}
                      >
                        <div className="font-medium">{event.startTime}</div>
                        <div className="truncate">{event.name}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <span>Draft</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Completed</span>
        </div>
      </div>
    </div>
  )
}
