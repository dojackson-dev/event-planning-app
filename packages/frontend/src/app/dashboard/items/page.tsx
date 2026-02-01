'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Item, ItemType, ServiceItemCategory } from '@/types'
import { Plus, Edit, Trash2, Package, Music, Lightbulb, Users, Utensils, Sparkles, Building2, Grid3x3, Clock, Percent, Mic, Wine, Shield, DollarSign, Monitor, Calendar } from 'lucide-react'

// Use ServiceItemCategory enum values to match database
const categoryLabels: Record<string, string> = {
  [ServiceItemCategory.FACILITY_RENTAL]: 'Facility Rental',
  [ServiceItemCategory.SECURITY_DEPOSIT]: 'Security Deposit',
  [ServiceItemCategory.SOUND_SYSTEM]: 'Sound System',
  [ServiceItemCategory.AV_EQUIPMENT]: 'AV Equipment',
  [ServiceItemCategory.PLANNING_SERVICES]: 'Planning Services',
  [ServiceItemCategory.ADDITIONAL_TIME]: 'Additional Time',
  [ServiceItemCategory.HOSTING_SERVICES]: 'Hosting Services',
  [ServiceItemCategory.CATERING]: 'Catering',
  [ServiceItemCategory.BAR_SERVICES]: 'Bar Services',
  [ServiceItemCategory.SECURITY_SERVICES]: 'Security Services',
  [ServiceItemCategory.DECORATIONS]: 'Decorations',
  [ServiceItemCategory.SALES_TAX]: 'Sales Tax',
  [ServiceItemCategory.ITEMS]: 'Items',
  [ServiceItemCategory.MISC]: 'Miscellaneous',
}

// Category fallback icons and colors
const categoryIcons: Record<string, React.ComponentType<any>> = {
  [ServiceItemCategory.FACILITY_RENTAL]: Building2,
  [ServiceItemCategory.SECURITY_DEPOSIT]: DollarSign,
  [ServiceItemCategory.SOUND_SYSTEM]: Music,
  [ServiceItemCategory.AV_EQUIPMENT]: Monitor,
  [ServiceItemCategory.PLANNING_SERVICES]: Calendar,
  [ServiceItemCategory.ADDITIONAL_TIME]: Clock,
  [ServiceItemCategory.HOSTING_SERVICES]: Mic,
  [ServiceItemCategory.CATERING]: Utensils,
  [ServiceItemCategory.BAR_SERVICES]: Wine,
  [ServiceItemCategory.SECURITY_SERVICES]: Shield,
  [ServiceItemCategory.DECORATIONS]: Sparkles,
  [ServiceItemCategory.SALES_TAX]: Percent,
  [ServiceItemCategory.ITEMS]: Package,
  [ServiceItemCategory.MISC]: Grid3x3,
}

const categoryColors: Record<string, string> = {
  [ServiceItemCategory.FACILITY_RENTAL]: 'bg-blue-100 text-blue-600',
  [ServiceItemCategory.SECURITY_DEPOSIT]: 'bg-green-100 text-green-600',
  [ServiceItemCategory.SOUND_SYSTEM]: 'bg-indigo-100 text-indigo-600',
  [ServiceItemCategory.AV_EQUIPMENT]: 'bg-cyan-100 text-cyan-600',
  [ServiceItemCategory.PLANNING_SERVICES]: 'bg-amber-100 text-amber-600',
  [ServiceItemCategory.ADDITIONAL_TIME]: 'bg-yellow-100 text-yellow-600',
  [ServiceItemCategory.HOSTING_SERVICES]: 'bg-teal-100 text-teal-600',
  [ServiceItemCategory.CATERING]: 'bg-red-100 text-red-600',
  [ServiceItemCategory.BAR_SERVICES]: 'bg-purple-100 text-purple-600',
  [ServiceItemCategory.SECURITY_SERVICES]: 'bg-slate-100 text-slate-600',
  [ServiceItemCategory.DECORATIONS]: 'bg-pink-100 text-pink-600',
  [ServiceItemCategory.SALES_TAX]: 'bg-gray-100 text-gray-600',
  [ServiceItemCategory.ITEMS]: 'bg-orange-100 text-orange-600',
  [ServiceItemCategory.MISC]: 'bg-gray-100 text-gray-600',
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: ServiceItemCategory.MISC,
    default_price: '',
    image_url: '',
    is_active: true,
  })

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    try {
      const response = await api.get<Item[]>('/service-items')
      setItems(response.data)
    } catch (error) {
      console.error('Failed to fetch items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        default_price: parseFloat(formData.default_price),
        image_url: formData.image_url || null,
        is_active: formData.is_active,
      }

      if (editingItem) {
        await api.put(`/service-items/${editingItem.id}`, payload)
      } else {
        await api.post('/service-items', payload)
      }

      setShowModal(false)
      setEditingItem(null)
      setFormData({ name: '', description: '', category: ServiceItemCategory.MISC, default_price: '', image_url: '', is_active: true })
      fetchItems()
    } catch (error: any) {
      console.error('Failed to save item:', error)
      setError(error.response?.data?.message || 'Failed to save item. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category as ServiceItemCategory,
      default_price: item.default_price.toString(),
      image_url: item.image_url || '',
      is_active: item.is_active,
    })
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await api.delete(`/service-items/${id}`)
      fetchItems()
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const filteredItems = filter === 'all' ? items : items.filter(i => i.category === filter)

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Items & Packages</h1>
        <button
          onClick={() => {
            setEditingItem(null)
            setFormData({ name: '', description: '', category: ServiceItemCategory.MISC, default_price: '', image_url: '', is_active: true })
            setShowModal(true)
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          All Items
        </button>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const CategoryIcon = categoryIcons[item.category] || Package
          const colorClass = categoryColors[item.category] || 'bg-gray-100 text-gray-600'
          
          return (
            <div key={item.id} className="bg-white rounded-lg shadow overflow-hidden">
              {/* Image or Category Icon */}
              <div className="relative h-48 bg-gray-50">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${colorClass} opacity-30`}>
                    <CategoryIcon className="h-24 w-24" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                    <span className="inline-block mt-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                      {categoryLabels[item.category]}
                    </span>
                  </div>
                  <div className="flex gap-2 ml-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                )}
                <div className="pt-4 border-t">
                  <p className="text-2xl font-bold text-gray-900">${item.default_price.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            No items found. Add your first item!
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as ServiceItemCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use category icon as fallback
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.default_price}
                  onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                    setError(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
