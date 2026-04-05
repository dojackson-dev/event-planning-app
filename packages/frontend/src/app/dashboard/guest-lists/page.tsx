'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { GuestList, Event } from '@/types'
import { Plus, Search, Users, Lock, Unlock, Share2, ExternalLink } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

export default function GuestListsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [guestLists, setGuestLists] = useState<GuestList[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEvent, setFilterEvent] = useState<string>('')

  useEffect(() => {
    fetchGuestLists()
    fetchEvents()
  }, [])

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

  const fetchEvents = async () => {
    try {
      const response = await api.get<Event[]>('/events')
      setEvents(response.data)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const handleToggleLock = async (id: number, isLocked: boolean) => {
    try {
      await api.post(`/guest-lists/${id}/${isLocked ? 'unlock' : 'lock'}`)
      fetchGuestLists()
    } catch (error) {
      console.error('Failed to toggle lock:', error)
      alert('Failed to update guest list')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this guest list? All guests will be removed.')) return

    try {
      await api.delete(`/guest-lists/${id}`)
      fetchGuestLists()
    } catch (error) {
      console.error('Failed to delete guest list:', error)
      alert('Failed to delete guest list')
    }
  }

  const copyShareLink = (token: string, type: 'edit' | 'arrival') => {
    const baseUrl = window.location.origin
    const url = type === 'edit' 
      ? `${baseUrl}/guest-list/share/${token}`
      : `${baseUrl}/guest-list/arrival/${token}`
    navigator.clipboard.writeText(url)
    alert(`${type === 'edit' ? 'Edit' : 'Arrival tracking'} link copied to clipboard!`)
  }

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code)
    alert(`Access code ${code} copied to clipboard!`)
  }

  const copyLinkAndCode = (shareToken: string, accessCode: string) => {
    const baseUrl = window.location.origin
    const url = `${baseUrl}/guest-list/share/${shareToken}`
    const message = `You've been invited to view and edit the guest list!\n\nLink: ${url}\nAccess Code: ${accessCode}\n\nOpen the link and enter the code to get started.`
    navigator.clipboard.writeText(message)
    alert('Link & code copied! Paste it into a text or email.')
  }

  const filteredLists = guestLists.filter((list) => {
    const matchesSearch = list.event?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         list.client?.firstName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesEvent = !filterEvent || list.eventId?.toString() === filterEvent
    return matchesSearch && matchesEvent
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading guest lists...</div>
      </div>
    )
  }

  if (user?.role !== 'owner') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">Only owners can manage guest lists</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Guest Lists</h1>
        <p className="text-gray-600 mt-1 mb-3">Manage door lists and track guest arrivals</p>
        <div className="flex justify-center">
          <button
            onClick={() => router.push('/dashboard/guest-lists/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Create Guest List
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
              placeholder="Search by event or client..."
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

      {/* Guest Lists */}
      <div className="bg-white shadow-md rounded-lg">
        {filteredLists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No guest lists found</p>
            <button
              onClick={() => router.push('/dashboard/guest-lists/new')}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Create your first guest list
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {filteredLists.map((list) => (
              <div
                key={list.id}
                onClick={() => router.push(`/dashboard/guest-lists/${list.id}`)}
                className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md cursor-pointer transition-shadow flex flex-col"
              >
                {/* Card top info */}
                <div className="p-4 flex-1">
                  <div className="mb-3">
                    <p className="text-base font-semibold text-gray-900 leading-tight">
                      {list.event?.name || '—'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {list.client ? `${list.client.firstName} ${list.client.lastName}` : '—'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {list.event ? parseLocalDate(list.event.date).toLocaleDateString() : '—'}
                    </p>
                  </div>

                  {/* Status + guest count row */}
                  <div className="flex items-center justify-between mt-3">
                    {list.isLocked ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        <Lock className="h-3 w-3" /> Locked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        <Unlock className="h-3 w-3" /> Open
                      </span>
                    )}
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{list.guests?.length || 0} guests</span>
                    </div>
                  </div>

                  {/* Secondary actions */}
                  <div className="flex gap-3 mt-3 text-xs" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => copyShareLink(list.arrivalToken, 'arrival')}
                      className="text-green-600 hover:text-green-800 flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" /> Door Link
                    </button>
                    <button
                      onClick={() => handleToggleLock(list.id, list.isLocked)}
                      className={list.isLocked ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'}
                    >
                      {list.isLocked ? 'Unlock' : 'Lock'}
                    </button>
                    <button
                      onClick={() => handleDelete(list.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Share section at bottom */}
                <div className="border-t border-gray-100 px-4 py-3 flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="font-mono text-sm font-semibold text-purple-700 tracking-widest">
                    {list.accessCode}
                  </span>
                  <button
                    onClick={() => copyLinkAndCode(list.shareToken, list.accessCode)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                  >
                    <Share2 className="h-4 w-4" />
                    Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
