'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Event } from '@/types'
import Pagination from '@/components/Pagination'
import { Plus, Calendar, MapPin, Users, Trash2, Search } from 'lucide-react'
import { format } from 'date-fns'
import { useVenue } from '@/contexts/VenueContext'

// Parse date string without timezone conversion (YYYY-MM-DD -> Date at midnight local time)
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return 'Not set'
  
  // Parse time string (HH:MM or HH:MM:SS)
  const [hours, minutes] = timeString.split(':').slice(0, 2)
  const hour = parseInt(hours, 10)
  const min = minutes
  
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  
  return `${displayHour}:${min} ${ampm}`
}

export default function EventsPage() {
  const { activeVenue } = useVenue()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [activeVenue])

  const fetchEvents = async () => {
    try {
      const params = activeVenue ? { venueId: activeVenue.id } : {}
      const response = await api.get<Event[]>('/events', { params })
      setEvents(response.data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const filteredEvents = events.filter(event => {
    const eventDate = parseLocalDate(event.date)
    if (filter === 'upcoming' && eventDate < now) return false
    if (filter === 'past' && eventDate >= now) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        event.name.toLowerCase().includes(q) ||
        (event.intakeEventName || '').toLowerCase().includes(q) ||
        (event.clientName || '').toLowerCase().includes(q) ||
        (event.venue || '').toLowerCase().includes(q) ||
        (event.location || '').toLowerCase().includes(q)
      )
    }
    return true
  }).sort((a, b) => {
    const dateA = parseLocalDate(a.date).getTime()
    const dateB = parseLocalDate(b.date).getTime()
    const nowTime = now.getTime()
    const aUpcoming = dateA >= nowTime
    const bUpcoming = dateB >= nowTime
    // Upcoming events first (ascending — closest first)
    // Past events after (descending — most recent first)
    if (aUpcoming && bUpcoming) return dateA - dateB
    if (!aUpcoming && !bUpcoming) return dateB - dateA
    return aUpcoming ? -1 : 1
  })

  const CARDS_PER_PAGE = 12
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setCurrentPage(1) }, [searchTerm, filter])
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * CARDS_PER_PAGE, currentPage * CARDS_PER_PAGE)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    setIsDeleting(true)
    try {
      await api.delete(`/events/${eventId}`)
      setEvents(events.filter(e => e.id !== eventId))
      setShowDeleteConfirm(null)
      alert('Event deleted successfully')
    } catch (error) {
      console.error('Failed to delete event:', error)
      alert('Failed to delete event. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-3">Events</h1>
        <div className="flex justify-center">
          <Link
            href="/dashboard/events/new"
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Event
          </Link>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by client name, event name, venue, or location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | 'upcoming' | 'past')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Events</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past Events</option>
        </select>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEvents.map((event) => (
          <Link
            key={event.id}
            href={`/dashboard/events/${event.id}/manage`}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer block overflow-hidden"
          >
            {/* Status stripe */}
            <div className={`h-1 w-full ${
              event.status === 'scheduled' ? 'bg-purple-400' :
              event.status === 'completed' ? 'bg-gray-400' :
              event.status === 'draft' ? 'bg-purple-300' :
              'bg-purple-300'
            }`} />
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0">
                  {event.clientName && (
                    <p className="text-sm font-semibold text-primary-600 truncate mb-0.5">{event.clientName}</p>
                  )}
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600 leading-snug">
                    {event.intakeEventName || event.name}
                  </h3>
                </div>
                <span className={`ml-2 flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                  {event.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(parseLocalDate(event.date), 'PPP')}
                  ({format(parseLocalDate(event.date), 'EEEE')})
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {event.venue}
                </div>
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-2" />
                  Up to {event.maxGuests} guests
                </div>
              </div>

              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </p>
              </div>
            </div>
          </Link>
        ))}

        {filteredEvents.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No events found. Create your first event!
          </div>
        )}
      </div>
      <Pagination currentPage={currentPage} totalItems={filteredEvents.length} itemsPerPage={CARDS_PER_PAGE} onPageChange={setCurrentPage} />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Delete Event?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEvent(showDeleteConfirm)}
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
