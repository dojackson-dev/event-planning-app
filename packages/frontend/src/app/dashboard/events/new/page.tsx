'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { EventType, EventStatus, Event } from '@/types'

const eventTypeLabels: Record<EventType, string> = {
  [EventType.WEDDING_RECEPTION]: 'Wedding Reception',
  [EventType.BIRTHDAY_PARTY]: 'Birthday Party',
  [EventType.RETIREMENT]: 'Retirement',
  [EventType.ANNIVERSARY]: 'Anniversary',
  [EventType.BABY_SHOWER]: 'Baby Shower',
  [EventType.CORPORATE_EVENT]: 'Corporate Event',
  [EventType.FUNDRAISER_GALA]: 'Fundraiser Gala',
  [EventType.CONCERT_SHOW]: 'Concert/Show',
  [EventType.CONFERENCE_MEETING]: 'Conference/Meeting',
  [EventType.WORKSHOP]: 'Workshop',
  [EventType.QUINCEANERA]: 'Quinceañera',
  [EventType.SWEET_16]: 'Sweet 16',
  [EventType.PROM_FORMAL]: 'Prom/Formal',
  [EventType.FAMILY_REUNION]: 'Family Reunion',
  [EventType.MEMORIAL_SERVICE]: 'Memorial Service',
  [EventType.PRODUCT_LAUNCH]: 'Product Launch',
  [EventType.HOLIDAY_PARTY]: 'Holiday Party',
  [EventType.ENGAGEMENT_PARTY]: 'Engagement Party',
  [EventType.GRADUATION_PARTY]: 'Graduation Party',
}

export default function NewEventPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showConflictWarning, setShowConflictWarning] = useState(false)
  const [conflictingEvents, setConflictingEvents] = useState<Event[]>([])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    maxGuests: '',
    status: EventStatus.DRAFT,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const checkForConflicts = async () => {
    try {
      const response = await api.get<Event[]>(`/events`)
      const allEvents = response.data

      // Filter for events on the same date with time overlap
      // Check all events (not just draft), and validate that both events have times
      const conflicts = allEvents.filter(event => 
        event.date === formData.date &&
        formData.startTime &&
        formData.endTime &&
        event.startTime &&
        event.endTime &&
        // Check if times overlap: event starts before new event ends AND event ends after new event starts
        (event.startTime < formData.endTime && event.endTime > formData.startTime)
      )

      if (conflicts.length > 0) {
        setConflictingEvents(conflicts)
        setShowConflictWarning(true)
        return false
      }

      return true
    } catch (err) {
      console.error('Error checking conflicts:', err)
      return true // Continue anyway if check fails
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // Check for conflicts
    const hasNoConflicts = await checkForConflicts()
    if (!hasNoConflicts) {
      return
    }

    setLoading(true)

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        date: formData.date, // YYYY-MM-DD format from date input
        startTime: formData.startTime,
        endTime: formData.endTime,
        venue: formData.venue,
        maxGuests: formData.maxGuests ? parseInt(formData.maxGuests) : null,
        status: formData.status,
      }

      console.log('Creating event with payload:', payload)
      await api.post('/events', payload)
      router.push('/dashboard/events')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Event</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-3xl">
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-800 rounded-md">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Basic Info */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value={EventStatus.DRAFT}>Draft</option>
                  <option value={EventStatus.SCHEDULED}>Scheduled</option>
                  <option value={EventStatus.COMPLETED}>Completed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Date & Time</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="startTime"
                  required
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  name="endTime"
                  required
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Venue & Capacity */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Venue & Capacity</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Venue *
                </label>
                <input
                  type="text"
                  name="venue"
                  required
                  value={formData.venue}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Guests *
                </label>
                <input
                  type="number"
                  name="maxGuests"
                  required
                  min="1"
                  value={formData.maxGuests}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      {/* Conflict Warning Modal */}
      {showConflictWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-lg font-bold text-red-900 mb-4">⚠️ Schedule Conflict Detected!</h2>
              <p className="text-gray-600 mb-4">
                The following event(s) conflict with your selected time on the same day:
              </p>
              
              <div className="mb-6 max-h-48 overflow-y-auto bg-gray-50 p-4 rounded">
                {conflictingEvents.map(event => (
                  <div key={event.id} className="mb-3 pb-3 border-b last:border-b-0">
                    <p className="font-semibold text-gray-900">{event.name}</p>
                    <p className="text-sm text-gray-600">
                      {event.startTime} - {event.endTime}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Status: {event.status}</p>
                  </div>
                ))}
              </div>

              <p className="text-gray-600 mb-6 text-sm">
                You cannot create an event at the same time as an existing event. Please choose a different time or date.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConflictWarning(false)}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Go Back & Change Time
                </button>
              </div>
            </div>
          </div>
        </div>
      )}    </div>
  )
}