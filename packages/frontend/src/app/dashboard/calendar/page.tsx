'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, X, Edit2, Trash2, Clock, MapPin, Users } from 'lucide-react'

type ViewType = 'month' | 'week'

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('month')
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
  }

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return
    setIsDeleting(true)
    try {
      await api.delete(`/events/${selectedEvent.id}`)
      setEvents(events.filter(e => e.id !== selectedEvent.id))
      setSelectedEvent(null)
      setShowDeleteConfirm(false)
      alert('Event deleted successfully')
    } catch (error) {
      console.error('Failed to delete event:', error)
      alert('Failed to delete event. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditEvent = () => {
    if (!selectedEvent) return
    router.push(`/dashboard/events/${selectedEvent.id}/edit`)
  }

  const closeModal = () => {
    setSelectedEvent(null)
    setShowDeleteConfirm(false)
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
                        onClick={() => handleEventClick(event)}
                        className={`text-xs p-1.5 rounded cursor-pointer hover:shadow-md transition-shadow ${
                          event.status === 'scheduled'
                            ? 'bg-green-100 text-green-800'
                            : event.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                        title={`${event.name} - ${event.startTime}`}
                      >
                        <div className="font-medium truncate">{event.startTime}</div>
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

      {/* Event Details Modal */}
      {selectedEvent && !showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-start p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">{selectedEvent.name}</h2>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Date */}
              <div className="flex items-start gap-3 pb-4 border-b">
                <CalendarDays className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                  <p className="text-base font-semibold text-gray-900">{format(new Date(selectedEvent.date), 'PPP')}</p>
                </div>
              </div>
              
              {/* Start & End Time */}
              <div className="flex items-start gap-3 pb-4 border-b">
                <Clock className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div className="w-full">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Time</p>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Start</p>
                      <p className="text-base font-semibold text-gray-900">{selectedEvent.startTime || 'Not set'}</p>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">End</p>
                      <p className="text-base font-semibold text-gray-900">{selectedEvent.endTime || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Venue */}
              <div className="flex items-start gap-3 pb-4 border-b">
                <MapPin className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Venue</p>
                  <p className="text-base font-semibold text-gray-900">{selectedEvent.venue || 'Not specified'}</p>
                </div>
              </div>
              
              {/* Max Guests */}
              <div className="flex items-start gap-3 pb-4 border-b">
                <Users className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Max Guests</p>
                  <p className="text-base font-semibold text-gray-900">{selectedEvent.maxGuests ? `${selectedEvent.maxGuests} guests` : 'Not specified'}</p>
                </div>
              </div>
              
              {/* Status */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Status</p>
                <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${
                  selectedEvent.status === 'scheduled'
                    ? 'bg-green-100 text-green-800'
                    : selectedEvent.status === 'draft'
                    ? 'bg-gray-100 text-gray-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={handleEditEvent}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedEvent && showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Delete Event?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{selectedEvent.name}</strong>? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
