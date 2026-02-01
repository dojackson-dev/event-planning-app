'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Event } from '@/types'
import { Calendar, Clock, MapPin, Users, ArrowLeft, Edit, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { parseLocalDate } from '@/lib/dateUtils'

export default function EventDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const response = await api.get<Event>(`/events/${eventId}`)
      setEvent(response.data)
    } catch (err: any) {
      console.error('Failed to fetch event:', err)
      setError('Failed to load event details')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      setDeleting(true)
      await api.delete(`/events/${eventId}`)
      router.push('/dashboard/events')
    } catch (err: any) {
      console.error('Failed to delete event:', err)
      alert('Failed to delete event')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">{error || 'Event not found'}</h1>
          <Link
            href="/dashboard/events"
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Events
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Events
        </Link>
        <div className="flex gap-2">
          <Link
            href={`/dashboard/events/${eventId}/manage`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4 mr-2" />
            Manage
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{event.name}</h1>
          <span className="inline-block px-3 py-1 bg-gray-100 text-gray-800 text-sm font-semibold rounded-full">
            {event.status || 'Draft'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Date & Time */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center mb-2">
              <Calendar className="h-5 w-5 text-primary-600 mr-3" />
              <h3 className="text-sm font-semibold text-gray-600">Date</h3>
            </div>
            <p className="text-lg text-gray-900">{format(parseLocalDate(event.date), 'PPPP')}</p>
            {(event as any).dayOfWeek && <p className="text-sm text-gray-600 mt-1">{(event as any).dayOfWeek}</p>}
          </div>

          {/* Time */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center mb-2">
              <Clock className="h-5 w-5 text-primary-600 mr-3" />
              <h3 className="text-sm font-semibold text-gray-600">Time</h3>
            </div>
            <p className="text-lg text-gray-900">
              {event.startTime} - {event.endTime}
            </p>
          </div>

          {/* Venue */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center mb-2">
              <MapPin className="h-5 w-5 text-primary-600 mr-3" />
              <h3 className="text-sm font-semibold text-gray-600">Venue</h3>
            </div>
            <p className="text-lg text-gray-900">{event.venue}</p>
          </div>

          {/* Max Guests */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center mb-2">
              <Users className="h-5 w-5 text-primary-600 mr-3" />
              <h3 className="text-sm font-semibold text-gray-600">Max Guests</h3>
            </div>
            <p className="text-lg text-gray-900">{event.maxGuests || 'Not specified'}</p>
          </div>

          {/* Description */}
          {event.description && (
            <div className="md:col-span-2 bg-gray-50 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Description</h3>
              <p className="text-gray-900">{event.description}</p>
            </div>
          )}
        </div>

        {/* Services Section */}
        {((event as any).caterer || (event as any).decorator || (event as any).musicType || (event as any).barOption) && (
          <div className="mt-8 pt-8 border-t">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(event as any).caterer && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Caterer</p>
                  <p className="text-lg font-semibold text-gray-900">{(event as any).caterer}</p>
                </div>
              )}
              {(event as any).decorator && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Decorator</p>
                  <p className="text-lg font-semibold text-gray-900">{(event as any).decorator}</p>
                </div>
              )}
              {(event as any).musicType && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Music Type</p>
                  <p className="text-lg font-semibold text-gray-900">{(event as any).musicType}</p>
                </div>
              )}
              {(event as any).barOption && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Bar Option</p>
                  <p className="text-lg font-semibold text-gray-900">{(event as any).barOption}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
