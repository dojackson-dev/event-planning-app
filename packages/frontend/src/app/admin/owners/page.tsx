'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  Building2,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Download
} from 'lucide-react'

interface Owner {
  id: string
  email: string
  first_name: string
  last_name: string
  phone: string | null
  created_at: string
  company_name: string | null
  venue_name: string | null
  subscription_status?: string
  trial_ends_at?: string
  events_count?: number
  clients_count?: number
}

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null)

  useEffect(() => {
    fetchOwners()
  }, [])

  const fetchOwners = async () => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'owner')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch additional data for each owner
      const ownersWithStats = await Promise.all(
        (data || []).map(async (owner) => {
          // Get events count
          const { count: eventsCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', owner.id)

          // Get owner details from owners table
          const { data: ownerDetails } = await supabase
            .from('owners')
            .select('company_name, venue_name, subscription_status, trial_ends_at')
            .eq('user_id', owner.id)
            .single()

          return {
            ...owner,
            events_count: eventsCount || 0,
            company_name: ownerDetails?.company_name || null,
            venue_name: ownerDetails?.venue_name || null,
            subscription_status: ownerDetails?.subscription_status || 'unknown',
            trial_ends_at: ownerDetails?.trial_ends_at || null
          }
        })
      )

      setOwners(ownersWithStats)
    } catch (error) {
      console.error('Error fetching owners:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOwners = owners.filter(owner =>
    owner.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    owner.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      past_due: 'bg-yellow-100 text-yellow-800',
      unknown: 'bg-gray-100 text-gray-800'
    }
    return styles[status] || styles.unknown
  }

  const deleteOwner = async (ownerId: string) => {
    if (!confirm('Are you sure you want to delete this owner? This action cannot be undone.')) {
      return
    }

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', ownerId)

      if (error) throw error

      setOwners(owners.filter(o => o.id !== ownerId))
      setSelectedOwner(null)
    } catch (error) {
      console.error('Error deleting owner:', error)
      alert('Failed to delete owner')
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Owners</h1>
          <p className="text-gray-600 mt-1">{owners.length} total owners</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Owners Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company/Venue
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Events
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredOwners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  {searchTerm ? 'No owners match your search' : 'No owners found'}
                </td>
              </tr>
            ) : (
              filteredOwners.map((owner) => (
                <tr key={owner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                          {owner.first_name?.[0]}{owner.last_name?.[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {owner.first_name} {owner.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{owner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-900">{owner.company_name || '-'}</p>
                    <p className="text-sm text-gray-500">{owner.venue_name || '-'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(owner.subscription_status || 'unknown')}`}>
                      {owner.subscription_status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {owner.events_count || 0}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(owner.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setSelectedOwner(selectedOwner === owner.id ? null : owner.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="h-4 w-4 text-gray-500" />
                      </button>
                      {selectedOwner === owner.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
                          <Link
                            href={`/admin/owners/${owner.id}`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Eye className="h-4 w-4" />
                            View Details
                          </Link>
                          <Link
                            href={`/admin/owners/${owner.id}/edit`}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Edit className="h-4 w-4" />
                            Edit Owner
                          </Link>
                          <button
                            onClick={() => deleteOwner(owner.id)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Owner
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
