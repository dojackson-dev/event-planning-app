'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { Item } from '@/types'
import { Plus, Edit, Trash2, Package } from 'lucide-react'

const categoryLabels: Record<string, string> = {
  sound_system: 'Sound System',
  lighting: 'Lighting',
  staging: 'Staging',
  furniture: 'Furniture',
  catering: 'Catering',
  decoration: 'Decoration',
  other: 'Other'
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'sound_system',
    default_price: '',
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
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        category: formData.category,
        default_price: parseFloat(formData.default_price),
        is_active: formData.is_active,
      }

      if (editingItem) {
        await api.put(`/service-items/${editingItem.id}`, payload)
      } else {
        await api.post('/service-items', payload)
      }

      setShowModal(false)
      setEditingItem(null)
      setFormData({ name: '', description: '', category: 'sound_system', default_price: '', is_active: true })
      fetchItems()
    } catch (error) {
      console.error('Failed to save item:', error)
    }
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      default_price: item.default_price.toString(),
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
            setFormData({ name: '', description: '', type: ItemType.SETUP, price: '' })
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
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-primary-500 mr-3" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                  <span className="text-xs text-gray-500">{item.category}</span>
                </div>
              </div>
              <div className="flex gap-2">
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
        ))}

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
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingItem(null)
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
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
