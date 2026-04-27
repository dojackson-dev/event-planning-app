'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Estimate, EstimateStatus } from '@/types'
import { Search, Eye } from 'lucide-react'
import { useVenue } from '@/contexts/VenueContext'

function getClientName(estimate: Estimate): string {
  const booking = (estimate.booking as any)
  if (booking?.contact_name) return booking.contact_name
  // legacy: user join
  const user = booking?.user
  if (user) {
    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim()
    if (name) return name
    if (user.email) return user.email
  }
  if (estimate.intake_form?.contact_name) return estimate.intake_form.contact_name
  return 'N/A'
}

const statusColors: Record<EstimateStatus, string> = {
  [EstimateStatus.DRAFT]: 'bg-gray-100 text-gray-700',
  [EstimateStatus.SENT]: 'bg-blue-100 text-blue-700',
  [EstimateStatus.APPROVED]: 'bg-green-100 text-green-700',
  [EstimateStatus.REJECTED]: 'bg-red-100 text-red-700',
  [EstimateStatus.EXPIRED]: 'bg-yellow-100 text-yellow-700',
  [EstimateStatus.CONVERTED]: 'bg-purple-100 text-purple-700',
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<EstimateStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const { user } = useAuth()
  const { activeVenue } = useVenue()

  useEffect(() => {
    fetchEstimates()
  }, [activeVenue])

  const fetchEstimates = async () => {
    setLoading(true)
    setEstimates([])
    try {
      const params: any = user?.role === 'owner' ? { ownerId: user.id } : {}
      if (activeVenue) params.venueId = activeVenue.id
      const res = await api.get<Estimate[]>('/estimates', { params })
      setEstimates(res.data)
    } catch (err) {
      console.error('Failed to fetch estimates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, number: string) => {
    if (!confirm(`Delete estimate ${number}? This cannot be undone.`)) return
    try {
      await api.delete(`/estimates/${id}`)
      fetchEstimates()
    } catch (err) {
      console.error('Failed to delete estimate:', err)
      alert('Failed to delete estimate')
    }
  }

  const filtered = estimates
    .filter(e => filter === 'all' || e.status === filter)
    .filter(e => {
      if (!searchTerm) return true
      const q = searchTerm.toLowerCase()
      return (
        e.estimate_number.toLowerCase().includes(q) ||
        getClientName(e).toLowerCase().includes(q)
      )
    })

  const isExpiringSoon = (e: Estimate) => {
    if (e.status !== EstimateStatus.SENT && e.status !== EstimateStatus.DRAFT) return false
    const days = (new Date(e.expiration_date + 'T12:00:00').getTime() - Date.now()) / 86400000
    return days >= 0 && days <= 7
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-600">Loading estimates...</div></div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">Estimates</h1>
        <p className="text-center text-sm text-gray-500">
          Estimates are created through the <a href="/dashboard/events" className="text-primary-600 hover:underline font-medium">Events</a> tab.
        </p>
      </div>

      {/* Search + Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by estimate # or client name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as EstimateStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          {Object.values(EstimateStatus).map(s => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center text-gray-500">
          No estimates found. Estimates are created through the <a href="/dashboard/events" className="text-primary-600 hover:underline">Events</a> tab.
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="block md:hidden space-y-3">
            {filtered.map(estimate => (
              <div
                key={estimate.id}
                className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/estimates/${estimate.id}`)}
              >
                {/* Status stripe */}
                <div className={`h-1 w-full ${
                  estimate.status === 'approved' ? 'bg-green-400' :
                  estimate.status === 'sent' ? 'bg-fuchsia-500' :
                  estimate.status === 'expired' ? 'bg-fuchsia-700' :
                  estimate.status === 'rejected' ? 'bg-gray-400' :
                  'bg-fuchsia-300'
                }`} />
                <div className="p-4 active:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{estimate.estimate_number}</p>
                    <p className="text-sm text-gray-600 truncate">{getClientName(estimate)}</p>
                  </div>
                  <div className="ml-2 flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${statusColors[estimate.status]}`}>
                      {estimate.status}
                    </span>
                    {(estimate as any).viewed_at && (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <Eye className="h-3 w-3" /> Viewed
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">${Number(estimate.total_amount).toFixed(2)}</span>
                  <span>·</span>
                  <span className={isExpiringSoon(estimate) ? 'text-orange-600 font-semibold' : ''}>
                    Exp: {new Date(estimate.expiration_date + 'T12:00:00').toLocaleDateString()}{isExpiringSoon(estimate) && ' ⚠'}
                  </span>
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center" onClick={e => e.stopPropagation()}>
                  <span className="text-xs text-gray-400">Tap to view details →</span>
                  <button
                    onClick={() => handleDelete(estimate.id, estimate.estimate_number)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-xs"
                  >
                    Delete
                  </button>
                </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table view */}
          <div className="hidden md:block bg-white shadow-sm rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Number</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Issue Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Expires</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map(estimate => (
                  <tr
                    key={estimate.id}
                    className={`hover:bg-gray-50 cursor-pointer border-l-4 ${
                      estimate.status === 'approved' ? 'border-green-400' :
                      estimate.status === 'sent' ? 'border-fuchsia-500' :
                      estimate.status === 'expired' ? 'border-fuchsia-700' :
                      estimate.status === 'rejected' ? 'border-gray-400' :
                      'border-fuchsia-300'
                    }`}
                    onClick={() => router.push(`/dashboard/estimates/${estimate.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{estimate.estimate_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getClientName(estimate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[estimate.status]}`}>
                          {estimate.status}
                        </span>
                        {(estimate as any).viewed_at && (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                            <Eye className="h-3 w-3" /> Viewed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(estimate.issue_date + 'T12:00:00').toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={isExpiringSoon(estimate) ? 'text-orange-600 font-semibold' : 'text-gray-600'}>
                        {new Date(estimate.expiration_date + 'T12:00:00').toLocaleDateString()}
                        {isExpiringSoon(estimate) && ' ⚠'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      ${Number(estimate.total_amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(estimate.id, estimate.estimate_number)}
                        className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
