'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Contract, ContractStatus } from '@/types'
import { FileText, Search, ChevronDown, Eye } from 'lucide-react'
import { useVenue } from '@/contexts/VenueContext'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ContractStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set())
  const router = useRouter()
  const { user } = useAuth()
  const { activeVenue } = useVenue()

  useEffect(() => {
    fetchContracts()
  }, [activeVenue])

  const fetchContracts = async () => {
    setLoading(true)
    setContracts([])
    try {
      const params: any = user?.role === 'owner' ? { ownerId: user.id } : user?.role === 'customer' ? { clientId: user.id } : {}
      if (activeVenue) params.venueId = activeVenue.id
      const response = await api.get<Contract[]>('/contracts', { params })
      setContracts(response.data)
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (contract: Contract, newStatus: ContractStatus) => {
    if (newStatus === contract.status) return
    setUpdatingId(contract.id)
    try {
      await api.patch(`/contracts/${contract.id}`, { status: newStatus })
      setContracts(prev => prev.map(c => c.id === contract.id ? { ...c, status: newStatus, updatedAt: new Date().toISOString() } : c))
      setRecentlyChanged(prev => new Set(prev).add(contract.id))
      setTimeout(() => {
        setRecentlyChanged(prev => {
          const next = new Set(prev)
          next.delete(contract.id)
          return next
        })
      }, 3000)
    } catch (error) {
      console.error('Failed to update contract status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.SIGNED:
        return 'bg-green-100 text-green-800'
      case ContractStatus.SENT:
        return 'bg-blue-100 text-blue-800'
      case ContractStatus.DRAFT:
        return 'bg-gray-100 text-gray-800'
      case ContractStatus.CANCELLED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Cancelled contracts older than 7 days are hidden except in the 'cancelled' filter
  const isVisibleCancelled = (contract: Contract) => {
    const updated = new Date(contract.updatedAt)
    const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24)
    return daysSince <= 7
  }

  const filteredContracts = contracts
    .filter(contract => {
      if (contract.status === ContractStatus.CANCELLED && filter !== ContractStatus.CANCELLED) {
        return isVisibleCancelled(contract)
      }
      return filter === 'all' || contract.status === filter
    })
    .filter(contract =>
      searchTerm === '' ||
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )

  const StatusSelector = ({ contract }: { contract: Contract }) => {
    const highlighted = recentlyChanged.has(contract.id)
    if (user?.role !== 'owner') {
      return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contract.status)}`}>
          {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
        </span>
      )
    }
    return (
      <div
        className={`relative inline-flex items-center rounded-full transition-all duration-300 ${highlighted ? 'ring-2 ring-green-400 ring-offset-1' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <select
          value={contract.status}
          onChange={e => handleStatusChange(contract, e.target.value as ContractStatus)}
          disabled={updatingId === contract.id}
          className={`pl-2 pr-6 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer appearance-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${getStatusColor(contract.status)}`}
        >
          {Object.values(ContractStatus).map(s => (
            <option key={s} value={s} className="bg-white text-gray-900 font-normal">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 pointer-events-none opacity-60" />
        {updatingId === contract.id && (
          <span className="absolute -right-5 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-3 w-3 text-gray-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </span>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading contracts...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-3">
          {user?.role === 'owner' ? 'My Contracts' : 'Contracts'}
        </h1>
        {user?.role === 'owner' && (
          <p className="text-center text-sm text-gray-500">
            Contracts are created through the <a href="/dashboard/events" className="text-primary-600 hover:underline font-medium">Events</a> tab.
          </p>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by title or contract #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as ContractStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          {Object.values(ContractStatus).map(s => (
            <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {filter !== ContractStatus.CANCELLED && (
        <p className="text-xs text-gray-400 mb-3 -mt-3">
          Cancelled contracts are hidden after 7 days. Use the &quot;Cancelled&quot; filter to see all.
        </p>
      )}

      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {filteredContracts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No contracts found</div>
        ) : (
          filteredContracts.map((contract) => (
            <div
              key={contract.id}
              className={`bg-white rounded-lg shadow p-4 cursor-pointer active:bg-gray-50 hover:shadow-md transition-all duration-300 ${
                recentlyChanged.has(contract.id) ? 'ring-2 ring-green-400 shadow-md' : ''
              }`}
              onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{contract.title}</p>
                  <p className="text-sm text-gray-500">{contract.contractNumber}</p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                  <StatusSelector contract={contract} />
                  {(contract as any).viewed_at && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <Eye className="h-3 w-3" /> Viewed
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-600">
                <span>
                  {contract.client ? `${contract.client.firstName} ${contract.client.lastName}` : 'N/A'}
                </span>
                <span>·</span>
                <span>{new Date(contract.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-3 pt-3 border-t flex justify-between items-center">
                <span className="text-xs text-gray-400">Tap to view details →</span>
                <FileText className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop table view */}
      <div className="hidden md:block bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Contract #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredContracts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                  No contracts found
                </td>
              </tr>
            ) : (
              filteredContracts.map((contract) => (
                <tr
                  key={contract.id}
                  className={`cursor-pointer transition-all duration-300 ${
                    recentlyChanged.has(contract.id)
                      ? 'bg-green-50 hover:bg-green-50'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {contract.contractNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contract.client
                      ? `${contract.client.firstName} ${contract.client.lastName}`
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contract.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      <StatusSelector contract={contract} />
                      {(contract as any).viewed_at && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full w-fit">
                          <Eye className="h-3 w-3" /> Viewed
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      View
                    </button>
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
