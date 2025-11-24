'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Security, Event } from '@/types'
import { ArrowLeft, Phone, Calendar, Clock, Check } from 'lucide-react'

export default function SecurityDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [security, setSecurity] = useState<Security | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  
  // Form fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [eventId, setEventId] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchSecurity()
      fetchEvents()
    }
  }, [params.id])

  const fetchSecurity = async () => {
    try {
      const response = await api.get<Security>(`/security/${params.id}`)
      setSecurity(response.data)
      setName(response.data.name)
      setPhone(response.data.phone)
      setEventId(response.data.eventId?.toString() || '')
    } catch (error) {
      console.error('Failed to fetch security:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await api.get<Event[]>('/events')
      setEvents(response.data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name || !phone) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const securityData = {
        name,
        phone,
        eventId: eventId ? Number(eventId) : null,
      }

      await api.put(`/security/${params.id}`, securityData)
      setIsEditing(false)
      fetchSecurity()
    } catch (error) {
      console.error('Failed to update security:', error)
      alert('Failed to update security personnel')
    } finally {
      setSaving(false)
    }
  }

  const handleRecordArrival = async () => {
    if (!confirm('Record arrival time now?')) return

    try {
      await api.post(`/security/${params.id}/arrival`)
      fetchSecurity()
    } catch (error) {
      console.error('Failed to record arrival:', error)
      alert('Failed to record arrival')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this security record?')) return

    try {
      await api.delete(`/security/${params.id}`)
      router.push('/dashboard/security')
    } catch (error) {
      console.error('Failed to delete security:', error)
      alert('Failed to delete security record')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only owners can manage security personnel</p>
        </div>
      </div>
    )
  }

  if (!security) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Security personnel not found</div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/security')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Security
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{security.name}</h1>
            <p className="text-gray-600 mt-1">Security Personnel Details</p>
          </div>
          {!isEditing && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Assignment
            </label>
            <select
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- No Event Assignment --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.date).toLocaleDateString()}
                  {event.startTime && ` at ${event.startTime}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false)
                setName(security.name)
                setPhone(security.phone)
                setEventId(security.eventId?.toString() || '')
              }}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        /* View Mode */
        <>
          {/* Contact Information */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="mt-1 text-gray-900">{security.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <p className="text-gray-900">{security.phone}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Assignment */}
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Assignment</h2>
            {security.event ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900">{security.event.name}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-blue-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {new Date(security.event.date).toLocaleDateString()}
                  </div>
                  {security.event.startTime && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {security.event.startTime}
                      {security.event.endTime && ` - ${security.event.endTime}`}
                    </div>
                  )}
                </div>
                {security.event.venue && (
                  <p className="text-sm text-blue-700 mt-2">📍 {security.event.venue}</p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">Not assigned to any event</p>
            )}
          </div>

          {/* Arrival Tracking */}
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Arrival Tracking</h2>
            {security.arrivalTime ? (
              <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg p-4">
                <Check className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Arrived</p>
                  <p className="text-sm text-green-700">
                    {new Date(security.arrivalTime).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">Arrival time not recorded yet</p>
                <button
                  onClick={handleRecordArrival}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                >
                  <Clock className="h-5 w-5" />
                  Record Arrival Now
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
