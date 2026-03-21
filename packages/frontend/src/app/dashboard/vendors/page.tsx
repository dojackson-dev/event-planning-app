'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { Store, Phone, Mail, Globe, MapPin, Search, Plus, Tag } from 'lucide-react'

interface Vendor {
  id: string
  owner_id: string
  name: string
  category: string
  contact_name?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  notes?: string
  is_active: boolean
  created_at: string
}

export default function VendorsPage() {
  const { user } = useAuth()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVendors()
  }, [])

  const fetchVendors = async () => {
    try {
      const params = user?.id ? { ownerId: user.id } : {}
      const response = await api.get<Vendor[]>('/vendors', { params })
      setVendors(response.data)
    } catch (err: any) {
      setError('Vendors feature is not available on this branch. Merge from dev to enable it.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contact_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your vendor relationships</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          onClick={() => alert('Add vendor form coming soon')}
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search vendors by name, category, or contact..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <Store className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
          <p className="text-yellow-800 font-medium">Vendors Unavailable</p>
          <p className="text-yellow-600 text-sm mt-1">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <Store className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No vendors found</p>
          <p className="text-gray-400 text-sm mt-1">Add your first vendor to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(vendor => (
            <div key={vendor.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{vendor.name}</h3>
                  {vendor.contact_name && (
                    <p className="text-sm text-gray-500">{vendor.contact_name}</p>
                  )}
                </div>
                {vendor.category && (
                  <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                    <Tag className="h-3 w-3" />
                    {vendor.category}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 text-sm text-gray-600">
                {vendor.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <a href={`mailto:${vendor.email}`} className="hover:text-blue-600 truncate">{vendor.email}</a>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <a href={`tel:${vendor.phone}`} className="hover:text-blue-600">{vendor.phone}</a>
                  </div>
                )}
                {vendor.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <a href={vendor.website} target="_blank" rel="noreferrer" className="hover:text-blue-600 truncate">{vendor.website}</a>
                  </div>
                )}
                {vendor.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{vendor.address}</span>
                  </div>
                )}
              </div>
              {!vendor.is_active && (
                <span className="mt-3 inline-block text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Inactive</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
