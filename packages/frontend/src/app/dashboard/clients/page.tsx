'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { User, Calendar, Mail, Phone, Clock, Eye, CheckCircle } from 'lucide-react'

interface IntakeForm {
  id: string
  user_id: string
  event_type: string
  event_date: string
  event_time: string
  guest_count: number
  contact_name: string
  contact_email: string
  contact_phone: string
  services_needed: string
  venue_preference: string | null
  catering_requirements: string | null
  equipment_needs: string | null
  special_requests: string | null
  dietary_restrictions: string | null
  accessibility_requirements: string | null
  budget_range: string | null
  how_did_you_hear: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<IntakeForm[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'converted'>('all')

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await api.get<IntakeForm[]>('/intake-forms')
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    if (filter === 'all') return true
    return client.status === filter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'converted': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatEventType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Clients & Leads</h1>
          <p className="mt-2 text-gray-600">Manage intake forms and convert leads to bookings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Leads</p>
                <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
              <User className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">New</p>
                <p className="text-2xl font-bold text-blue-600">
                  {clients.filter(c => c.status === 'new').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Contacted</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {clients.filter(c => c.status === 'contacted').length}
                </p>
              </div>
              <Mail className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Converted</p>
                <p className="text-2xl font-bold text-green-600">
                  {clients.filter(c => c.status === 'converted').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({clients.length})
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'new'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New ({clients.filter(c => c.status === 'new').length})
            </button>
            <button
              onClick={() => setFilter('contacted')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'contacted'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Contacted ({clients.filter(c => c.status === 'contacted').length})
            </button>
            <button
              onClick={() => setFilter('converted')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'converted'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Converted ({clients.filter(c => c.status === 'converted').length})
            </button>
          </div>
        </div>

        {/* Clients List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No clients found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Guests</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{client.contact_name}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.contact_email}
                          </div>
                          {client.contact_phone && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {client.contact_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatEventType(client.event_type)}</div>
                        {client.budget_range && (
                          <div className="text-sm text-gray-500">{client.budget_range}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-900">
                          <Calendar className="h-4 w-4" />
                          {formatDate(client.event_date)}
                        </div>
                        {client.event_time && (
                          <div className="text-sm text-gray-500">{client.event_time}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {client.guest_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(client.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
