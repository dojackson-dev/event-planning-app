'use client'

import { useState, useEffect } from 'react'
import clientApi from '@/lib/clientApi'
import { Package, DollarSign, Tag } from 'lucide-react'

const CATEGORY_LABELS: Record<string, string> = {
  facility_rental:    '🏛️ Facility Rental',
  security_deposit:   '🔒 Security Deposit',
  sound_system:       '🔊 Sound System',
  av_equipment:       '📽️ AV Equipment',
  planning_services:  '📋 Planning Services',
  additional_time:    '⏱️ Additional Time',
  hosting_services:   '🎤 Hosting Services',
  catering:           '🍽️ Catering',
  bar_services:       '🍹 Bar Services',
  security_services:  '🛡️ Security Services',
  decorations:        '🎨 Decorations',
  sales_tax:          '📊 Sales Tax',
  items:              '📦 Items',
  misc:               '✨ Miscellaneous',
}

export default function ClientItemsPage() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    clientApi.get('/items')
      .then((res) => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const categories = ['all', ...Array.from(new Set(items.map((i: any) => i.category).filter(Boolean)))]

  const filtered = activeCategory === 'all'
    ? items
    : items.filter((i: any) => i.category === activeCategory)

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-500">Loading items...</div>
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-6 w-6 text-primary-600" />
          Items &amp; Packages
        </h1>
        <span className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Category filter tabs */}
      {categories.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeCategory === cat
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-primary-400 hover:text-primary-600'
              }`}
            >
              {cat === 'all' ? 'All' : (CATEGORY_LABELS[cat] ?? cat)}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No items available.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item: any) => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3">
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-36 object-cover rounded-lg"
                />
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                    <Tag className="h-3 w-3" />
                    {CATEGORY_LABELS[item.category] ?? item.category ?? 'Item'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-bold text-primary-600 flex items-center gap-0.5">
                    <DollarSign className="h-4 w-4" />
                    {Number(item.default_price ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
              {item.description && (
                <p className="text-sm text-gray-600 line-clamp-3">{item.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
