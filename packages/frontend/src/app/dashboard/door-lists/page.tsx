'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Event, GuestList, Guest } from '@/types'
import { 
  Search, 
  Users, 
  UserCheck, 
  Clock, 
  Calendar,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Filter,
  Download
} from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

export default function DoorListsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [guestLists, setGuestLists] = useState<GuestList[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [selectedGuestList, setSelectedGuestList] = useState<GuestList | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'arrived' | 'pending'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
    fetchGuestLists()
  }, [])

  useEffect(() => {
    if (selectedEvent && guestLists.length > 0) {
      const list = guestLists.find(gl => gl.eventId?.toString() === selectedEvent)
      setSelectedGuestList(list || null)
    }
  }, [selectedEvent, guestLists])

  const fetchEvents = async () => {
    try {
      const response = await api.get<Event[]>('/events')
      // Filter to upcoming or today's events
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const upcomingEvents = response.data.filter(event => {
        const eventDate = parseLocalDate(event.date)
        return eventDate >= today
      })
      setEvents(upcomingEvents)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const fetchGuestLists = async () => {
    try {
      const response = await api.get<GuestList[]>('/guest-lists')
      setGuestLists(response.data)
    } catch (error) {
      console.error('Failed to fetch guest lists:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (guestId: number) => {
    try {
      await api.post(`/guest-lists/guests/${guestId}/arrive`)
      fetchGuestLists()
    } catch (error) {
      console.error('Failed to check in guest:', error)
      alert('Failed to check in guest')
    }
  }

  const handleCheckOut = async (guestId: number) => {
    try {
      await api.post(`/guest-lists/guests/${guestId}/unarrive`)
      fetchGuestLists()
    } catch (error) {
      console.error('Failed to check out guest:', error)
      alert('Failed to check out guest')
    }
  }

  const getFilteredGuests = (): Guest[] => {
    if (!selectedGuestList?.guests) return []
    
    let filtered = selectedGuestList.guests

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(guest => 
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.phone.includes(searchTerm)
      )
    }

    // Apply status filter
    if (filterStatus === 'arrived') {
      filtered = filtered.filter(guest => (guest as any).hasArrived || ((guest as any).has_arrived || guest.hasArrived))
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(guest => !((guest as any).hasArrived || ((guest as any).has_arrived || guest.hasArrived)))
    }

    return filtered
  }

  const getStats = () => {
    if (!selectedGuestList?.guests) return { total: 0, arrived: 0, pending: 0, totalWithPlus: 0 }
    
    const guests = selectedGuestList.guests
    const arrived = guests.filter(g => (g as any).hasArrived || g.hasArrived).length
    const totalWithPlus = guests.reduce((sum, g) => sum + 1 + ((g as any).plusOneCount || g.plusOneCount || 0), 0)
    
    return {
      total: guests.length,
      arrived,
      pending: guests.length - arrived,
      totalWithPlus
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading door lists...</div>
      </div>
    )
  }

  if (user?.role !== 'owner' && user?.role !== 'planner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only staff can access door lists</p>
        </div>
      </div>
    )
  }

  const stats = getStats()
  const filteredGuests = getFilteredGuests()

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Door List Management</h1>
          <p className="text-gray-600 mt-1">Check in guests and manage arrivals in real-time</p>
        </div>

        {/* Event Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Event
          </label>
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg"
          >
            <option value="">-- Choose an event --</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {parseLocalDate(event.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
                {event.startTime && ` at ${event.startTime}`}
              </option>
            ))}
          </select>

          {events.length === 0 && (
            <p className="text-sm text-gray-500 mt-2">No upcoming events found</p>
          )}
        </div>

        {selectedGuestList ? (
          <>
            {/* Action Buttons */}
            <div className="mb-6 flex gap-3">
              <button
                onClick={() => router.push(`/dashboard/guest-lists/${selectedGuestList.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                Manage Guest List
              </button>
              <button
                onClick={() => router.push(`/dashboard/door-lists/${selectedGuestList.id}`)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                Full Door List View
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Guests</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Users className="h-10 w-10 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Arrived</p>
                    <p className="text-3xl font-bold text-green-600">{stats.arrived}</p>
                  </div>
                  <UserCheck className="h-10 w-10 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Pending</p>
                    <p className="text-3xl font-bold text-orange-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-10 w-10 text-orange-500" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total w/ Plus</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.totalWithPlus}</p>
                  </div>
                  <Users className="h-10 w-10 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      filterStatus === 'all'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus('arrived')}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      filterStatus === 'arrived'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Arrived
                  </button>
                  <button
                    onClick={() => setFilterStatus('pending')}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      filterStatus === 'pending'
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>
            </div>

            {/* Guest List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Guest List</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredGuests.length} guest{filteredGuests.length !== 1 ? 's' : ''} shown
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/guest-lists/${selectedGuestList.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Full Details
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {filteredGuests.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  {searchTerm || filterStatus !== 'all' 
                    ? 'No guests match your search criteria'
                    : 'No guests in this list yet'}
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredGuests.map((guest) => (
                    <div
                      key={guest.id}
                      className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                        ((guest as any).has_arrived || guest.hasArrived) ? 'bg-green-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${
                              ((guest as any).has_arrived || guest.hasArrived) 
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {guest.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">{guest.name}</h3>
                              <p className="text-sm text-gray-600">{guest.phone}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {((guest as any).plus_one_count || guest.plusOneCount || 0) > 0 && (
                            <div className="text-center px-3 py-1 bg-purple-100 rounded-lg">
                              <p className="text-xs text-purple-600 font-medium">Plus</p>
                              <p className="text-lg font-bold text-purple-700">{((guest as any).plus_one_count || guest.plusOneCount || 0)}</p>
                            </div>
                          )}

                          {((guest as any).has_arrived || guest.hasArrived) ? (
                            <div className="text-right mr-4">
                              <div className="flex items-center gap-2 text-green-600 mb-1">
                                <CheckCircle2 className="h-5 w-5" />
                                <span className="font-semibold">Checked In</span>
                              </div>
                              {((guest as any).arrived_at || guest.arrivedAt) && (
                                <p className="text-xs text-gray-500">
                                  {new Date(((guest as any).arrived_at || guest.arrivedAt)).toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit'
                                  })}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="text-right mr-4">
                              <div className="flex items-center gap-2 text-orange-600">
                                <Clock className="h-5 w-5" />
                                <span className="font-semibold">Not Arrived</span>
                              </div>
                            </div>
                          )}

                          {((guest as any).has_arrived || guest.hasArrived) ? (
                            <button
                              onClick={() => handleCheckOut(guest.id)}
                              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2"
                            >
                              <XCircle className="h-5 w-5" />
                              Undo
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCheckIn(guest.id)}
                              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                              Check In
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : selectedEvent ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">No guest list found for this event</p>
            <p className="text-sm text-gray-500 mb-6">
              Create a guest list first from the Guest Lists page
            </p>
            <button
              onClick={() => router.push('/dashboard/guest-lists/new')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Guest List
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">Select an event to view its door list</p>
          </div>
        )}
      </div>
    </div>
  )
}
