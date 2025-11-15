'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { EventType, EventStatus } from '@/types'

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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    setupTime: '',
    venue: '',
    maxGuests: '',
    eventType: EventType.BIRTHDAY_PARTY,
    status: EventStatus.DRAFT,
    services: {
      caterer: '',
      decorator: '',
      balloonDecorator: '',
      marquee: '',
      musicType: '' as 'dj' | 'band' | 'mc' | '',
    },
    barOption: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    if (name.startsWith('services.')) {
      const serviceName = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        services: {
          ...prev.services,
          [serviceName]: value,
        },
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const eventDate = new Date(formData.date)
      const dayOfWeek = eventDate.toLocaleDateString('en-US', { weekday: 'long' })

      const payload = {
        ...formData,
        dayOfWeek,
        maxGuests: parseInt(formData.maxGuests),
      }

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
                  Event Type *
                </label>
                <select
                  name="eventType"
                  required
                  value={formData.eventType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
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
                  Setup Time
                </label>
                <input
                  type="time"
                  name="setupTime"
                  value={formData.setupTime}
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

          {/* Services */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Caterer
                </label>
                <input
                  type="text"
                  name="services.caterer"
                  value={formData.services.caterer}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decorator
                </label>
                <input
                  type="text"
                  name="services.decorator"
                  value={formData.services.decorator}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Balloon Decorator
                </label>
                <input
                  type="text"
                  name="services.balloonDecorator"
                  value={formData.services.balloonDecorator}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Marquee
                </label>
                <input
                  type="text"
                  name="services.marquee"
                  value={formData.services.marquee}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Music Type
                </label>
                <select
                  name="services.musicType"
                  value={formData.services.musicType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">None</option>
                  <option value="dj">DJ</option>
                  <option value="band">Band</option>
                  <option value="mc">MC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bar Option
                </label>
                <input
                  type="text"
                  name="barOption"
                  value={formData.barOption}
                  onChange={handleChange}
                  placeholder="e.g., Open Bar, Cash Bar"
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
    </div>
  )
}
