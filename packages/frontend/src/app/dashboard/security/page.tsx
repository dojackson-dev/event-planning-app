'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Security, Event } from '@/types'
import { Plus, Search, Phone, Calendar, Clock, Check, ShieldCheck, ChevronRight } from 'lucide-react'
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

  const filteredSecurity = security.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.phone.includes(searchTerm)
    const matchesEvent = !filterEvent || s.eventId === filterEvent
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
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Security Management</h1>
        <p className="text-gray-600 mt-1 mb-3">Manage security personnel and track arrivals</p>
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/dashboard/security/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Add Security
          </button>
        </div>
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

      {/* Security Cards */}
      {filteredSecurity.length === 0 ? (
        <div className="bg-white shadow-md rounded-lg text-center py-12">
          <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No security personnel found</p>
          <button
            onClick={() => router.push('/dashboard/security/new')}
            className="mt-4 text-primary-600 hover:text-primary-700"
          >
            Add your first security personnel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSecurity.map((s) => (
            <button
              key={s.id}
              onClick={() => router.push(`/dashboard/security/${s.id}`)}
              className="bg-white shadow-md rounded-lg p-5 text-left hover:shadow-lg hover:border-primary-300 border border-transparent transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 rounded-full p-2">
                    <ShieldCheck className="h-5 w-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 group-hover:text-primary-700">{s.name}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                      <Phone className="h-3 w-3" />
                      {s.phone}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary-500 mt-1 shrink-0" />
              </div>

              {s.event ? (
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    {s.event.name}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3" />
                    {parseLocalDate(s.event.date).toLocaleDateString()}
                    {s.event.startTime && ` at ${s.event.startTime}`}
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-3 mt-3">
                  <span className="text-xs text-gray-400">No event assigned</span>
                </div>
              )}

              <div className="mt-3">
                {s.arrivalTime ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-md px-2 py-1 w-fit">
                    <Check className="h-3 w-3" />
                    Arrived {new Date(s.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 rounded-md px-2 py-1 w-fit">
                    Not yet arrived
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
