'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { GuestList, Guest } from '@/types'
import { 
  ArrowLeft,
  Search, 
  Users, 
  UserCheck, 
  Clock,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  Lock,
  Unlock,
  RefreshCw,
  UserPlus,
  Trash2,
  Edit
} from 'lucide-react'

export default function DoorListDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()
  const [guestList, setGuestList] = useState<GuestList | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'arrived' | 'pending'>('all')
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(false)

  useEffect(() => {
    fetchGuestList()
  }, [params.id])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchGuestList()
      }, 10000) // Refresh every 10 seconds

      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const fetchGuestList = async () => {
    try {
      const response = await api.get<GuestList>(`/guest-lists/${params.id}`)
      setGuestList(response.data)
    } catch (error) {
      console.error('Failed to fetch guest list:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async (guestId: number) => {
    try {
      await api.post(`/guest-lists/guests/${guestId}/arrive`)
      fetchGuestList()
    } catch (error) {
      console.error('Failed to check in guest:', error)
      alert('Failed to check in guest')
    }
  }

  const handleCheckOut = async (guestId: number) => {
    try {
      await api.post(`/guest-lists/guests/${guestId}/unarrive`)
      fetchGuestList()
    } catch (error) {
      console.error('Failed to check out guest:', error)
      alert('Failed to check out guest')
    }
  }

  const copyArrivalLink = () => {
    const baseUrl = window.location.origin
    const url = `${baseUrl}/guest-list/arrival/${guestList?.arrivalToken}`
    navigator.clipboard.writeText(url)
    alert('Arrival tracking link copied to clipboard!')
  }

  const exportToCSV = () => {
    if (!guestList?.guests) return

    const headers = ['Name', 'Phone', 'Plus Ones', 'Status', 'Arrival Time']
    const rows = guestList.guests.map(guest => [
      guest.name,
      guest.phone,
      guest.plusOneCount.toString(),
      guest.hasArrived ? 'Arrived' : 'Pending',
      guest.arrivedAt ? new Date(guest.arrivedAt).toLocaleString() : '-'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `door-list-${guestList.event?.name}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const getFilteredGuests = (): Guest[] => {
    if (!guestList?.guests) return []
    
    let filtered = guestList.guests

    if (searchTerm) {
      filtered = filtered.filter(guest => 
        guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        guest.phone.includes(searchTerm)
      )
    }

    if (filterStatus === 'arrived') {
      filtered = filtered.filter(guest => guest.hasArrived)
    } else if (filterStatus === 'pending') {
      filtered = filtered.filter(guest => !guest.hasArrived)
    }

    // Sort: pending first, then by name
    return filtered.sort((a, b) => {
      if (a.hasArrived === b.hasArrived) {
        return a.name.localeCompare(b.name)
      }
      return a.hasArrived ? 1 : -1
    })
  }

  const getStats = () => {
    if (!guestList?.guests) return { total: 0, arrived: 0, pending: 0, totalWithPlus: 0, arrivedWithPlus: 0 }
    
    const guests = guestList.guests
    const arrivedGuests = guests.filter(g => g.hasArrived)
    const arrived = arrivedGuests.length
    const totalWithPlus = guests.reduce((sum, g) => sum + 1 + g.plusOneCount, 0)
    const arrivedWithPlus = arrivedGuests.reduce((sum, g) => sum + 1 + g.plusOneCount, 0)
    
    return {
      total: guests.length,
      arrived,
      pending: guests.length - arrived,
      totalWithPlus,
      arrivedWithPlus
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading door list...</div>
      </div>
    )
  }

  if (!guestList) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-2">Door list not found</p>
          <button
            onClick={() => router.push('/dashboard/door-lists')}
            className="text-primary-600 hover:text-primary-700"
          >
            Back to Door Lists
          </button>
        </div>
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
          <button
            onClick={() => router.push('/dashboard/door-lists')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Door Lists
          </button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{guestList.event?.name}</h1>
              <p className="text-gray-600 mt-1">
                {guestList.event && new Date(guestList.event.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Access Code: <span className="font-mono font-semibold">{guestList.accessCode}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  autoRefresh
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto-Refresh {autoRefresh ? 'On' : 'Off'}
              </button>

              <button
                onClick={copyArrivalLink}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Share2 className="h-4 w-4" />
                Share Link
              </button>

              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                <p className="text-sm text-gray-600 mb-1">Total Count</p>
                <p className="text-3xl font-bold text-purple-600">{stats.totalWithPlus}</p>
                <p className="text-xs text-gray-500 mt-1">w/ plus ones</p>
              </div>
              <Users className="h-10 w-10 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Arrived Count</p>
                <p className="text-3xl font-bold text-teal-600">{stats.arrivedWithPlus}</p>
                <p className="text-xs text-gray-500 mt-1">w/ plus ones</p>
              </div>
              <UserCheck className="h-10 w-10 text-teal-500" />
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-lg"
                autoFocus
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
                All ({stats.total})
              </button>
              <button
                onClick={() => setFilterStatus('pending')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({stats.pending})
              </button>
              <button
                onClick={() => setFilterStatus('arrived')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  filterStatus === 'arrived'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Arrived ({stats.arrived})
              </button>
            </div>
          </div>
        </div>

        {/* Guest List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {filteredGuests.length} Guest{filteredGuests.length !== 1 ? 's' : ''}
            </h2>
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
                  className={`px-6 py-5 hover:bg-gray-50 transition-colors ${
                    guest.hasArrived ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex items-center gap-4">
                      <div className={`h-14 w-14 rounded-full flex items-center justify-center font-bold text-xl ${
                        guest.hasArrived 
                          ? 'bg-green-200 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {guest.name.charAt(0).toUpperCase()}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">{guest.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{guest.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {guest.plusOneCount > 0 && (
                        <div className="text-center px-4 py-2 bg-purple-100 rounded-lg">
                          <p className="text-xs text-purple-600 font-medium mb-1">Plus Ones</p>
                          <p className="text-2xl font-bold text-purple-700">{guest.plusOneCount}</p>
                        </div>
                      )}

                      {guest.hasArrived ? (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-green-600 mb-1">
                            <CheckCircle2 className="h-6 w-6" />
                            <span className="font-semibold text-lg">Checked In</span>
                          </div>
                          {guest.arrivedAt && (
                            <p className="text-sm text-gray-500">
                              {new Date(guest.arrivedAt).toLocaleString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-right">
                          <div className="flex items-center gap-2 text-orange-600">
                            <Clock className="h-6 w-6" />
                            <span className="font-semibold text-lg">Not Arrived</span>
                          </div>
                        </div>
                      )}

                      {guest.hasArrived ? (
                        <button
                          onClick={() => handleCheckOut(guest.id)}
                          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 text-lg"
                        >
                          <XCircle className="h-5 w-5" />
                          Undo Check-in
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCheckIn(guest.id)}
                          className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center gap-2 text-lg shadow-lg hover:shadow-xl"
                        >
                          <CheckCircle2 className="h-6 w-6" />
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
      </div>
    </div>
  )
}
