'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import api from '@/lib/api'
import { Event, User } from '@/types'
import { ArrowLeft } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

export default function NewGuestListPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [clientId, setClientId] = useState('')
  const [eventId, setEventId] = useState('')
  const [maxGuestsPerPerson, setMaxGuestsPerPerson] = useState(2)
  const [clients, setClients] = useState<User[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchClients = async () => {
    try {
      const supabase = createClient()
      
      // Try both table names since we've seen both used
      let bookingsData = null
      let bookingsError = null
      
      // Try 'booking' first (singular)
      const result1 = await supabase
        .from('booking')
        .select('user_id')
        .not('user_id', 'is', null)
        .limit(10)

      if (!result1.error && result1.data && result1.data.length > 0) {
        bookingsData = result1.data
        console.log('Found bookings in "booking" table:', bookingsData)
      } else {
        // Try 'bookings' (plural)
        const result2 = await supabase
          .from('bookings')
          .select('user_id')
          .not('user_id', 'is', null)
          .limit(10)
        
        if (!result2.error && result2.data) {
          bookingsData = result2.data
          console.log('Found bookings in "bookings" table:', bookingsData)
        } else {
          bookingsError = result2.error
          console.error('Error fetching from both tables:', result1.error, result2.error)
        }
      }

      if (bookingsError || !bookingsData || bookingsData.length === 0) {
        console.log('No bookings found or error occurred')
        setClients([])
        return
      }

      // Get unique user IDs
      const uniqueUserIds = [...new Set(bookingsData.map(b => b.user_id).filter(id => id))]
      console.log('Unique user IDs from bookings:', uniqueUserIds)

      if (uniqueUserIds.length === 0) {
        console.log('No user IDs found in bookings')
        setClients([])
        return
      }

      // Fetch user details
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', uniqueUserIds)

      if (usersError) {
        console.error('Supabase users error:', usersError)
        throw usersError
      }

      console.log('Users fetched from database:', usersData)
      
      // Transform snake_case to camelCase if needed
      const transformedData = usersData?.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name || user.firstName || 'Unknown',
        lastName: user.last_name || user.lastName || '',
        role: user.role,
        phone: user.phone,
        ownerId: user.owner_id || user.ownerId,
        tenantId: user.tenant_id || user.tenantId,
        createdAt: user.created_at || user.createdAt,
        updatedAt: user.updated_at || user.updatedAt,
      })) || []
      
      console.log('Clients to display:', transformedData)
      setClients(transformedData)
    } catch (error) {
      console.error('Failed to fetch clients:', error)
      setClients([])
    }
  }

  const fetchEvents = async () => {
    try {
      const response = await api.get<Event[]>('/events')
      console.log('Fetched events:', response.data)
      setEvents(response.data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
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
      const guestListData = {
        clientId: user?.id, // Use current logged-in user as the client
        eventId: eventId, // Keep as string (UUID)
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
            Select Event *
          </label>
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Select an event --</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {parseLocalDate(event.date).toLocaleDateString()}
                {event.startTime && ` at ${event.startTime}`}
              </option>
            ))}
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
