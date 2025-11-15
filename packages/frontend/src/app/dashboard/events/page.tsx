'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Event } from '@/types'
import { Plus, Calendar, MapPin, Users, Settings } from 'lucide-react'
import { format } from 'date-fns'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')

  useEffect(() => {
    fetchEvents()
  }, [])

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

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.date)
    const now = new Date()
    
    if (filter === 'upcoming') {
      return eventDate >= now
    } else if (filter === 'past') {
      return eventDate < now
    }
    return true
  })

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

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Events</h1>
        <Link
          href="/dashboard/events/new"
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Event
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          All Events
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === 'upcoming'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === 'past'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Past Events
        </button>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <Link href={`/dashboard/events/${event.id}`} className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-primary-600">{event.name}</h3>
                </Link>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(event.status)}`}>
                  {event.status}
                </span>
              </div>
              
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  {format(new Date(event.date), 'PPP')} ({event.dayOfWeek})
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
                  {event.startTime} - {event.endTime}
                </p>
                <Link
                  href={`/dashboard/events/${event.id}/manage`}
                  className="inline-flex items-center px-3 py-1 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700"
                >
                  <Settings className="h-3 w-3 mr-1" />
                  Manage
                </Link>
              </div>
            </div>
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No events found. Create your first event!
          </div>
        )}
      </div>
    </div>
  )
}
