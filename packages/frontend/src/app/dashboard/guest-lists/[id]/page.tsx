'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Plus, Trash2, Edit2, Save, X, Share2 } from 'lucide-react'
import ShareLinkModal from '@/components/ShareLinkModal'

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
  share_token: string
  arrival_token: string
  is_locked: boolean
  created_at: string
  updated_at: string
}

export default function GuestListDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [guestList, setGuestList] = useState<GuestList | null>(null)
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingGuest, setEditingGuest] = useState<number | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  
  // Form state
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [plusOnes, setPlusOnes] = useState(0)

  useEffect(() => {
    fetchGuestList()
  }, [params.id])

  const fetchGuestList = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/guest-lists/${params.id}`)
      console.log('Guest list response:', response.data)
      setGuestList(response.data)
      
      // Fetch guests separately
      try {
        const guestsResponse = await api.get(`/guest-lists/${params.id}/guests`)
        console.log('Guests response:', guestsResponse.data)
        setGuests(guestsResponse.data || [])
      } catch (err) {
        console.error('Failed to fetch guests:', err)
        setGuests([])
      }
    } catch (error) {
      console.error('Failed to fetch guest list:', error)
      alert('Failed to load guest list')
    } finally {
      setLoading(false)
    }
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const guestData = {
        name,
        phone: phone || undefined,
        plusOnes: Number(plusOnes),
      }

      await api.post(`/guest-lists/${params.id}/guests`, guestData)
      
      // Reset form
      setName('')
      setPhone('')
      setPlusOnes(0)
      setShowAddForm(false)
      
      // Refresh guest list
      fetchGuestList()
    } catch (error) {
      console.error('Failed to add guest:', error)
      alert('Failed to add guest')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!guestList) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-lg text-gray-600 mb-4">Guest list not found</p>
          <button
            onClick={() => router.push('/dashboard/guest-lists')}
            className="text-primary-600 hover:text-primary-700"
          >
            Back to Guest Lists
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/guest-lists')}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Guest List Details</h1>
            <p className="text-sm text-gray-600">Access Code: {guestList.access_code}</p>
          </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            <Share2 className="w-4 h-4" />
            Share Link & Code
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Add Guest
          </button>
        </div>
      </div>

      {/* Share Modal */}
      <ShareLinkModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareToken={guestList.share_token}
        arrivalToken={guestList.arrival_token}
        accessCode={guestList.access_code}
      /utton>
      </div>

      {/* Add Guest Form */}
      {showAddForm && (
        <div className="mb-6 bg-white shadow-md rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add New Guest</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleAddGuest} className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plus Ones
              </label>
              <input
                type="number"
                value={plusOnes}
                onChange={(e) => setPlusOnes(Number(e.target.value))}
                min="0"
                max={guestList.max_guests_per_person}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div className="col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Add Guest
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Guest List */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            Guests ({guests.length})
          </h2>
        </div>
        
        {guests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No guests added yet</p>
            <p className="text-sm mt-2">Click "Add Guest" to start building your guest list</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {guests.map((guest) => (
              <div key={guest.id} className="px-6 py-4 hover:bg-gray-50 flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{guest.name}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    {guest.phone && <p>Phone: {guest.phone}</p>}
                    <p>Plus Ones: {guest.plus_one_count}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDeleteGuest(guest.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
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
