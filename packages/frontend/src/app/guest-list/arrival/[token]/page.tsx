'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { Lock, Users, Check, X, AlertCircle, Calendar, Search, UserCheck } from 'lucide-react'
import { parseLocalDate } from '@/lib/dateUtils'

interface Guest {
  id: number
  name: string
  phone: string
  plus_one_count: number
  has_arrived: boolean
  arrived_at?: string
}

interface GuestList {
  id: number
  event_id: string
  access_code: string
  created_at: string
  event?: {
    id: string
    name: string
    date: string
    venue?: string
  }
  guests?: Guest[]
}

export default function PublicGuestListArrivalPage() {
  const params = useParams()
  const [accessCode, setAccessCode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [guestList, setGuestList] = useState<GuestList | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.get(`/guest-lists/arrival/${params.token}`)
      const data = response.data

      // Verify the access code matches
      if (data.access_code.toUpperCase() !== accessCode.toUpperCase()) {
        setError('Invalid access code. Please try again.')
        setLoading(false)
        return
      }

      setGuestList(data)
      setGuests(data.guests || [])
      setIsAuthenticated(true)
    } catch (err) {
      console.error('Failed to access guest list:', err)
      setError('Failed to access guest list. Please check your link and code.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleArrival = async (guestId: number, hasArrived: boolean) => {
    try {
      if (hasArrived) {
        await api.post(`/guest-lists/guests/${guestId}/unarrive`)
      } else {
        await api.post(`/guest-lists/guests/${guestId}/arrive`)
      }
      
      // Refresh guest list
      const response = await api.get(`/guest-lists/arrival/${params.token}`)
      setGuests(response.data.guests || [])
    } catch (err) {
      console.error('Failed to update arrival status:', err)
      setError('Failed to update arrival status. Please try again.')
      setTimeout(() => setError(''), 3000)
    }
  }

  const filteredGuests = guests.filter((guest) =>
    guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    guest.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const arrivedCount = guests.filter((g) => g.has_arrived).length
  const totalGuests = guests.reduce((sum, g) => sum + 1 + g.plus_one_count, 0)
  const arrivedGuests = guests.filter((g) => g.has_arrived).reduce((sum, g) => sum + 1 + g.plus_one_count, 0)

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-teal-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Door List Access</h1>
            <p className="text-gray-600">Enter the access code to track guest arrivals</p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-4">
            <div>
              <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                Access Code
              </label>
              <input
                id="accessCode"
                type="text"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={20}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-center text-2xl font-mono tracking-wider uppercase"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !accessCode}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Verifying...' : 'Access Door List'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Security personnel: Use this to check in guests at the door.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{guestList?.event?.name || 'Door List'}</h1>
              {guestList?.event && (
                <div className="flex items-center gap-4 mt-2 text-sm text-green-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {parseLocalDate(guestList.event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  {guestList.event.venue && <span>@ {guestList.event.venue}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{guests.length}</div>
              <div className="text-sm text-gray-600">Total Names</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{arrivedGuests}/{totalGuests}</div>
              <div className="text-sm text-gray-600">Arrived (incl. +1s)</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{arrivedCount}/{guests.length}</div>
              <div className="text-sm text-gray-600">Checked In</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-6 bg-white shadow-md rounded-lg p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search guests by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-lg"
            />
          </div>
        </div>

        {/* Guest List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          {filteredGuests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">
                {searchTerm ? 'No guests found matching your search' : 'No guests on this list'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredGuests.map((guest) => (
                <div
                  key={guest.id}
                  className={`px-6 py-4 flex items-center justify-between transition-colors ${
                    guest.has_arrived ? 'bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg text-gray-900">{guest.name}</h3>
                      {guest.has_arrived && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                          <Check className="w-3 h-3" />
                          Arrived
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      {guest.phone && <p>📞 {guest.phone}</p>}
                      <p>👥 Party of {1 + guest.plus_one_count}</p>
                      {guest.arrived_at && (
                        <p className="text-xs text-gray-500">
                          Checked in at {new Date(guest.arrived_at).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleToggleArrival(guest.id, guest.has_arrived)}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      guest.has_arrived
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {guest.has_arrived ? (
                      <>
                        <X className="w-5 h-5" />
                        Undo
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Check In
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Door list for security and event staff. Tap "Check In" when guests arrive.</p>
        </div>
      </div>
    </div>
  )
}
