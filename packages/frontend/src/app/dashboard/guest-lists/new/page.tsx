'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Event } from '@/types'
import { ArrowLeft } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

interface IntakeClient {
  id: string
  contact_name: string
  contact_phone: string
  contact_email: string
}

export default function NewGuestListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clientId, setClientId] = useState('')
  const [eventId, setEventId] = useState('')
  const [maxGuestsPerPerson, setMaxGuestsPerPerson] = useState(2)
  const [intakeClients, setIntakeClients] = useState<IntakeClient[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [takenEventIds, setTakenEventIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      fetchEvents()
      fetchTakenEvents()
      fetchIntakeClients()
    }
  }, [user])

  const fetchIntakeClients = async () => {
    try {
      const res = await api.get('/intake-forms')
      const forms: IntakeClient[] = (res.data || []).map((f: any) => ({
        id: f.id,
        contact_name: f.contactName || f.contact_name || 'Unknown',
        contact_phone: f.contactPhone || f.contact_phone || '',
        contact_email: f.contactEmail || f.contact_email || '',
      }))
      setIntakeClients(forms)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
      setIntakeClients([])
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

  const fetchTakenEvents = async () => {
    try {
      const response = await api.get('/guest-lists')
      const ids = new Set<string>((response.data as any[]).map((gl: any) => String(gl.event_id)))
      setTakenEventIds(ids)
    } catch {
      // silently ignore — worst case duplicates are blocked by the backend
    }
  }

  if (user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only owners can create guest lists</p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!eventId) {
      alert('Please select an event')
      return
    }

    setLoading(true)
    try {
      if (!clientId) {
        alert('Please select a client')
        setLoading(false)
        return
      }

      const guestListData = {
        clientId, // intake form UUID — used by SMS and share features to identify the client
        eventId,
        maxGuestsPerPerson: Number(maxGuestsPerPerson),
      }

      console.log('Creating guest list with data:', guestListData)

      const response = await api.post('/guest-lists', guestListData)
      router.push(`/dashboard/guest-lists/${response.data.id}`)
    } catch (error) {
      console.error('Failed to create guest list:', error)
      alert('Failed to create guest list')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/guest-lists')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Guest Lists
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Guest List</h1>
        <p className="text-gray-600 mt-1">Set up a new door list for an event</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Client *
          </label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select a client --</option>
            {intakeClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.contact_name}{c.contact_phone ? ` · ${c.contact_phone}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Event *
          </label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select an event --</option>
            {events.filter(e => !takenEventIds.has(String(e.id))).map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {parseLocalDate(event.date).toLocaleDateString()}
                {event.startTime && ` at ${event.startTime}`}
              </option>
            ))}
            {events.length > 0 && events.every(e => takenEventIds.has(String(e.id))) && (
              <option disabled value="">All events already have a guest list</option>
            )}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Max Guests Per Person (Plus Ones) *
          </label>
          <input
            type="number"
            value={maxGuestsPerPerson}
            onChange={(e) => setMaxGuestsPerPerson(Number(e.target.value))}
            min="0"
            max="10"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Maximum number of additional guests each person can bring (0 = no plus ones allowed)
          </p>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/guest-lists')}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Guest List'}
          </button>
        </div>
      </form>
    </div>
  )
}
