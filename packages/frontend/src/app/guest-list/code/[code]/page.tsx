'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import api from '@/lib/api'
import { GuestList, Guest } from '@/types'
import { Users, Lock, Plus, Edit2, Trash2, Save, X } from 'lucide-react'

export default function GuestListCodePage() {
  const params = useParams()
  const code = params.code as string
  const [guestList, setGuestList] = useState<GuestList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    plusOneCount: 0,
  })

  useEffect(() => {
    fetchGuestList()
  }, [code])

  const fetchGuestList = async () => {
    try {
      const response = await api.get<GuestList>(`/guest-lists/code/${code}`)
      setGuestList(response.data)
      setError(null)
    } catch (error: any) {
      console.error('Failed to fetch guest list:', error)
      setError(error.response?.status === 404 ? 'Guest list not found' : 'Failed to load guest list')
    } finally {
      setLoading(false)
    }
  }

  const handleAddGuest = async () => {
    if (!guestList || !formData.name || !formData.phone) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await api.post(`/guest-lists/${guestList.id}/guests`, formData)
      setFormData({ name: '', phone: '', plusOneCount: 0 })
      setIsAddingNew(false)
      fetchGuestList()
    } catch (error) {
      console.error('Failed to add guest:', error)
      alert('Failed to add guest')
    }
  }

  const handleUpdateGuest = async () => {
    if (!editingGuest || !formData.name || !formData.phone) {
      alert('Please fill in all required fields')
      return
    }

    try {
      await api.put(`/guest-lists/guests/${editingGuest.id}`, formData)
      setEditingGuest(null)
      setFormData({ name: '', phone: '', plusOneCount: 0 })
      fetchGuestList()
    } catch (error) {
      console.error('Failed to update guest:', error)
      alert('Failed to update guest')
    }
  }

  const handleDeleteGuest = async (guestId: number) => {
    if (!confirm('Are you sure you want to remove this guest?')) return

    try {
      await api.delete(`/guest-lists/guests/${guestId}`)
      fetchGuestList()
    } catch (error) {
      console.error('Failed to delete guest:', error)
      alert('Failed to delete guest')
    }
  }

  const startEditing = (guest: Guest) => {
    setEditingGuest(guest)
    setFormData({
      name: guest.name,
      phone: guest.phone,
      plusOneCount: guest.plusOneCount,
    })
    setIsAddingNew(false)
  }

  const cancelEditing = () => {
    setEditingGuest(null)
    setIsAddingNew(false)
    setFormData({ name: '', phone: '', plusOneCount: 0 })
  }

  const startAddingNew = () => {
    setIsAddingNew(true)
    setEditingGuest(null)
    setFormData({ name: '', phone: '', plusOneCount: 0 })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading guest list...</div>
      </div>
    )
  }

  if (error || !guestList) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">{error || 'Guest list not found'}</p>
          <p className="text-sm text-gray-500">Please check the access code and try again</p>
        </div>
      </div>
    )
  }

  const totalGuests = guestList.guests?.reduce((sum, g) => sum + 1 + g.plusOneCount, 0) || 0

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-md rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{guestList.event?.name}</h1>
              <p className="text-gray-600 mb-1">
                {guestList.event && new Date(guestList.event.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-500">
                Access Code: <span className="font-mono font-semibold">{code}</span>
              </p>
            </div>
            {guestList.isLocked ? (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full">
                <Lock className="h-5 w-5" />
                List Locked
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
                <Users className="h-5 w-5" />
                {totalGuests} Total Guests
              </span>
            )}
          </div>

          {guestList.maxGuestsPerPerson > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                Maximum of {guestList.maxGuestsPerPerson} additional guest{guestList.maxGuestsPerPerson !== 1 ? 's' : ''} per person
              </p>
            </div>
          )}

          {guestList.isLocked && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                This guest list has been locked by the event organizer. No changes can be made.
              </p>
            </div>
          )}
        </div>

        {/* Add New Guest Form */}
        {!guestList.isLocked && !editingGuest && (
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            {!isAddingNew ? (
              <button
                onClick={startAddingNew}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add Guest
              </button>
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Guest</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Guest name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Guests
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={guestList.maxGuestsPerPerson}
                      value={formData.plusOneCount}
                      onChange={(e) => setFormData({ ...formData, plusOneCount: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {guestList.maxGuestsPerPerson > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum: {guestList.maxGuestsPerPerson}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleAddGuest}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                    >
                      <Save className="h-4 w-4" />
                      Add Guest
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guest List */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Guest List</h2>
            <p className="text-sm text-gray-600 mt-1">
              {guestList.guests?.length || 0} guest{(guestList.guests?.length || 0) !== 1 ? 's' : ''} · {totalGuests} total with additional guests
            </p>
          </div>

          {!guestList.guests || guestList.guests.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No guests added yet
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {guestList.guests.map((guest) => (
                <div key={guest.id} className="p-6">
                  {editingGuest?.id === guest.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Additional Guests
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={guestList.maxGuestsPerPerson}
                          value={formData.plusOneCount}
                          onChange={(e) => setFormData({ ...formData, plusOneCount: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleUpdateGuest}
                          className="flex-1 flex items-center justify-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
                        >
                          <Save className="h-4 w-4" />
                          Save Changes
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{guest.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{guest.phone}</p>
                        {guest.plusOneCount > 0 && (
                          <p className="text-sm text-gray-500 mt-2">
                            +{guest.plusOneCount} additional guest{guest.plusOneCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {!guestList.isLocked && (
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => startEditing(guest)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                            title="Edit guest"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGuest(guest.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                            title="Remove guest"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
