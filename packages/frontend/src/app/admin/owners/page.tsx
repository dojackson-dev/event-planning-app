'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Owner {
  id: string
  email: string
  first_name: string
  last_name: string
  business_name: string | null
  phone: string | null
  created_at: string
  status: string | null
  subscription: {
    subscription_status: string
    trial_ends_at: string | null
    stripe_customer_id: string | null
  } | null
}

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 400)
    return () => clearTimeout(t)
  }, [searchTerm])

  const getToken = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const fetchOwners = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const token = await getToken()
      if (!token) { setError('Not authenticated'); return }

      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (debouncedSearch) params.set('search', debouncedSearch)

      const res = await fetch(`${API_URL}/admin/owners?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setOwners(data.owners || [])
      setTotal(data.total || 0)
    } catch (err: any) {
      setError(err.message || 'Failed to load owners')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch])

  useEffect(() => { fetchOwners() }, [fetchOwners])

  const getStatusBadge = (status?: string | null) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      trialing: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      canceled: 'bg-red-100 text-red-800',
      past_due: 'bg-yellow-100 text-yellow-800',
    }
    return map[status || ''] || 'bg-gray-100 text-gray-800'
  }

  const deleteOwner = async (ownerId: string) => {
    if (!confirm('Are you sure you want to delete this owner? This cannot be undone.')) return
    try {
      const token = await getToken()
      const res = await fetch(`${API_URL}/admin/owners/${ownerId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'deleted' })
      })
      if (!res.ok) throw new Error('Failed')
      setOwners(owners.filter(o => o.id !== ownerId))
      setSelectedOwner(null)
    } catch (err: any) {
      alert('Failed to delete owner: ' + err.message)
    }
  }

  const totalPages = Math.ceil(total / limit)

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

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <p className="font-semibold">Failed to load owners</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchOwners} className="mt-3 text-sm underline">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Owners</h1>
          <p className="text-gray-600 mt-1">{total} total owners</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
          <Download className="h-4 w-4" />
          Export
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="p-4 flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or business..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1) }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Business</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subscription</th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {owners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  {debouncedSearch ? 'No owners match your search' : 'No owners found'}
                </td>
              </tr>
            ) : (
              owners.map((owner) => (
                <tr key={owner.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-600 font-medium text-sm">
                          {owner.first_name?.[0]}{owner.last_name?.[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{owner.first_name} {owner.last_name}</p>
                        <p className="text-sm text-gray-500">{owner.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {owner.business_name || <span className="text-gray-400"></span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadge(owner.subscription?.subscription_status)}`}>
                      {owner.subscription?.subscription_status || 'No plan'}
                    </span>
                    {owner.subscription?.trial_ends_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        Trial ends {new Date(owner.subscription.trial_ends_at).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(owner.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
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

        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {((page - 1) * limit) + 1}{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
