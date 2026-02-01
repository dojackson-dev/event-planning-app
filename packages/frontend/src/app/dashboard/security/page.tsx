'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Security, Event } from '@/types'
import { Plus, Search, Phone, Calendar, Clock, Check } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

export default function SecurityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [security, setSecurity] = useState<Security[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEvent, setFilterEvent] = useState<string>('')

  useEffect(() => {
    fetchSecurity()
    fetchEvents()
  }, [])

  const fetchSecurity = async () => {
    try {
      const response = await api.get<Security[]>('/security')
      setSecurity(response.data)
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

  const handleRecordArrival = async (id: number) => {
    if (!confirm('Record arrival time for this security personnel?')) return

    try {
      await api.post(`/security/${id}/arrival`)
      fetchSecurity()
    } catch (error) {
      console.error('Failed to record arrival:', error)
      alert('Failed to record arrival')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this security record?')) return

    try {
      await api.delete(`/security/${id}`)
      fetchSecurity()
    } catch (error) {
      console.error('Failed to delete security:', error)
      alert('Failed to delete security record')
    }
  }

  const filteredSecurity = security.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.phone.includes(searchTerm)
    const matchesEvent = !filterEvent || s.eventId?.toString() === filterEvent
    return matchesSearch && matchesEvent
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading security...</div>
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Management</h1>
          <p className="text-gray-600 mt-1">Manage security personnel and track arrivals</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/security/new')}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          <Plus className="h-5 w-5" />
          Add Security
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filterEvent}
            onChange={(e) => setFilterEvent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {parseLocalDate(event.date).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Security List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {filteredSecurity.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No security personnel found</p>
            <button
              onClick={() => router.push('/dashboard/security/new')}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Add your first security personnel
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event Assignment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Arrival Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSecurity.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        {s.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {s.event ? (
                        <div>
                          <div className="text-sm font-medium text-gray-900">{s.event.name}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                            <Calendar className="h-3 w-3" />
                            {parseLocalDate(s.event.date).toLocaleDateString()}
                            {s.event.startTime && (
                              <>
                                <Clock className="h-3 w-3 ml-2" />
                                {s.event.startTime}
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {s.arrivalTime ? (
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-sm text-gray-900">
                            {new Date(s.arrivalTime).toLocaleString()}
                          </span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleRecordArrival(s.id)}
                          className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200"
                        >
                          Record Arrival
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/security/${s.id}`)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
