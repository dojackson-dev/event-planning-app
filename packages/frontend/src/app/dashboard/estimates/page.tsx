'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Estimate, EstimateStatus } from '@/types'

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
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    fetchEstimates()
  }, [])

  const fetchEstimates = async () => {
    try {
      const params = user?.role === 'owner' ? { ownerId: user.id } : {}
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

  const filtered = filter === 'all' ? estimates : estimates.filter(e => e.status === filter)

  const isExpiringSoon = (e: Estimate) => {
    if (e.status !== EstimateStatus.SENT && e.status !== EstimateStatus.DRAFT) return false
    const days = (new Date(e.expiration_date).getTime() - Date.now()) / 86400000
    return days >= 0 && days <= 7
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-600">Loading estimates...</div></div>
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
        <button
          onClick={() => router.push('/dashboard/estimates/new')}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          + New Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['all', ...Object.values(EstimateStatus)] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize transition-colors ${
              filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center text-gray-500">
          No estimates found.{' '}
          <button onClick={() => router.push('/dashboard/estimates/new')} className="text-primary-600 hover:underline">
            Create one
          </button>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="block md:hidden space-y-3">
            {filtered.map(estimate => (
              <div
                key={estimate.id}
                className="bg-white rounded-lg shadow p-4 cursor-pointer active:bg-gray-50 hover:shadow-md transition-shadow"
                onClick={() => router.push(`/dashboard/estimates/${estimate.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900">{estimate.estimate_number}</p>
                    <p className="text-sm text-gray-600 truncate">{getClientName(estimate)}</p>
                  </div>
                  <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 capitalize ${statusColors[estimate.status]}`}>
                    {estimate.status}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                  <span className="font-semibold text-gray-900">${Number(estimate.total_amount).toFixed(2)}</span>
                  <span>·</span>
                  <span className={isExpiringSoon(estimate) ? 'text-orange-600 font-semibold' : ''}>
                    Exp: {new Date(estimate.expiration_date).toLocaleDateString()}{isExpiringSoon(estimate) && ' ⚠'}
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
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/dashboard/estimates/${estimate.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{estimate.estimate_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{getClientName(estimate)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[estimate.status]}`}>
                        {estimate.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(estimate.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={isExpiringSoon(estimate) ? 'text-orange-600 font-semibold' : 'text-gray-600'}>
                        {new Date(estimate.expiration_date).toLocaleDateString()}
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
