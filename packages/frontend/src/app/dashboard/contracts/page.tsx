'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Contract, ContractStatus } from '@/types'
import { FileText, Plus, Search } from 'lucide-react'

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<ContractStatus | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      const params = user?.role === 'owner' ? { ownerId: user.id } : user?.role === 'customer' ? { clientId: user.id } : {}
      const response = await api.get<Contract[]>('/contracts', { params })
      setContracts(response.data)
    } catch (error) {
      console.error('Failed to fetch contracts:', error)
    } finally {
      setLoading(false)
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

  const filteredContracts = contracts
    .filter(contract => filter === 'all' || contract.status === filter)
    .filter(contract => 
      searchTerm === '' || 
      contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())
    )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Loading contracts...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === 'owner' ? 'My Contracts' : 'Contracts'}
        </h1>
        {user?.role === 'owner' && (
          <button
            onClick={() => router.push('/dashboard/contracts/new')}
            className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Create Contract
          </button>
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
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>
      </div>

      {/* Mobile card view */}
      <div className="block md:hidden space-y-3">
        {filteredContracts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No contracts found</div>
        ) : (
          filteredContracts.map((contract) => (
            <div
              key={contract.id}
              className="bg-white rounded-lg shadow p-4 cursor-pointer active:bg-gray-50 hover:shadow-md transition-shadow"
              onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{contract.title}</p>
                  <p className="text-sm text-gray-500">{contract.contractNumber}</p>
                </div>
                <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${getStatusColor(contract.status)}`}>
                  {contract.status}
                </span>
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
                  className="hover:bg-gray-50 cursor-pointer"
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
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                      {contract.status}
                    </span>
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
