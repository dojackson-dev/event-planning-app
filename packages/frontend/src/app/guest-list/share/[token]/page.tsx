'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { Lock, Users, Plus, Trash2, Check, AlertCircle, Calendar } from 'lucide-react'

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
  client_id: string
  event_id: string
  max_guests_per_person: number
  access_code: string
  is_locked: boolean
  created_at: string
  updated_at: string
  event?: {
    id: string
    name: string
    date: string
    venue?: string
  }
  guests?: Guest[]
}

export default function PublicGuestListSharePage() {
  const params = useParams()
  const [accessCode, setAccessCode] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [guestList, setGuestList] = useState<GuestList | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [plusOnes, setPlusOnes] = useState(0)

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await api.get(`/guest-lists/share/${params.token}`)
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

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!guestList || guestList.is_locked) {
      setError('This guest list is locked and cannot be edited.')
      return
    }

    try {
      const guestData = {
        name,
        phone: phone || '',
        plusOnes: Number(plusOnes),
      }

      await api.post(`/guest-lists/${guestList.id}/guests`, guestData)
      
      // Reset form
      setName('')
      setPhone('')
      setPlusOnes(0)
      setShowAddForm(false)
      
      // Refresh guest list
      const response = await api.get(`/guest-lists/share/${params.token}`)
      setGuests(response.data.guests || [])
    } catch (err) {
      console.error('Failed to add guest:', err)
      setError('Failed to add guest. Please try again.')
    }
  }

  const handleDeleteGuest = async (guestId: number) => {
    if (!guestList || guestList.is_locked) {
      setError('This guest list is locked and cannot be edited.')
      return
    }

    if (!confirm('Are you sure you want to remove this guest?')) return
    
    try {
      await api.delete(`/guest-lists/guests/${guestId}`)
      
      // Refresh guest list
      const response = await api.get(`/guest-lists/share/${params.token}`)
      setGuests(response.data.guests || [])
    } catch (err) {
      console.error('Failed to delete guest:', err)
      setError('Failed to delete guest. Please try again.')
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
              <Lock className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Guest List</h1>
            <p className="text-gray-600">Enter the access code to view and edit the guest list</p>
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-center text-2xl font-mono tracking-wider uppercase"
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
              className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
            >
              {loading ? 'Verifying...' : 'Access Guest List'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-500">
              Don't have an access code? Contact the event organizer.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{guestList?.event?.name || 'Guest List'}</h1>
              {guestList?.event && (
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(guestList.event.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  {guestList.event.venue && <span>@ {guestList.event.venue}</span>}
                </div>
              )}
            </div>
            {guestList?.is_locked ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
                <Lock className="w-5 h-5" />
                <span className="font-medium">List Locked</span>
              </div>
            ) : (
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Guest
              </button>
            )}
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

        {/* Add Guest Form */}
        {showAddForm && !guestList?.is_locked && (
          <div className="mb-6 bg-white shadow-md rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Guest</h2>
            
            <form onSubmit={handleAddGuest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plus Ones
                  </label>
                  <input
                    type="number"
                    value={plusOnes}
                    onChange={(e) => setPlusOnes(Number(e.target.value))}
                    min="0"
                    max={guestList?.max_guests_per_person || 0}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  {guestList && (
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum {guestList.max_guests_per_person} plus ones allowed
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                >
                  Add Guest
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Guest List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">
                Guests ({guests.length})
              </h2>
            </div>
            {guestList?.is_locked && (
              <span className="text-sm text-gray-600">Editing is locked</span>
            )}
          </div>
          
          {guests.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg mb-2">No guests added yet</p>
              <p className="text-sm">
                {guestList?.is_locked
                  ? 'This guest list is currently locked.'
                  : 'Click "Add Guest" to start building your guest list'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {guests.map((guest) => (
                <div key={guest.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{guest.name}</h3>
                    <div className="text-sm text-gray-600 space-y-1 mt-1">
                      {guest.phone && <p>📞 {guest.phone}</p>}
                      <p>👥 {guest.plus_one_count} plus one{guest.plus_one_count !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  
                  {!guestList?.is_locked && (
                    <button
                      onClick={() => handleDeleteGuest(guest.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove guest"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>This is a shared guest list. Anyone with the link and access code can view and edit.</p>
        </div>
      </div>
    </div>
  )
}
