'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ServiceItemCategory } from '@/types'
import { 
  Heart, 
  Trash2, 
  Package, 
  Music, 
  Utensils, 
  Shield, 
  Wine,
  Building2,
  Sparkles,
  Clock,
  Mic,
  PartyPopper,
  Calculator,
  Users,
  Grid3x3,
  ShoppingCart
} from 'lucide-react'

// Category configuration
const categoryConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string; label: string }> = {
  facility: { icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Facility Rental' },
  catering: { icon: Utensils, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Catering' },
  items: { icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Items' },
  security: { icon: Shield, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Security' },
  bar: { icon: Wine, color: 'text-pink-600', bgColor: 'bg-pink-100', label: 'Bar Services' },
  sound_system: { icon: Music, color: 'text-indigo-600', bgColor: 'bg-indigo-100', label: 'Sound System' },
  av: { icon: Mic, color: 'text-cyan-600', bgColor: 'bg-cyan-100', label: 'Audio/Visual' },
  decorations: { icon: Sparkles, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100', label: 'Decorations' },
}

interface FavoriteItem {
  id: string
  name: string
  description: string
  category: string
  price: number
  addedAt: string
}

export default function CustomerFavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([
    {
      id: '1',
      name: 'Grand Ballroom Rental',
      description: 'Our largest venue space, perfect for weddings and galas.',
      category: 'facility',
      price: 3500,
      addedAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Premium Sound System',
      description: 'Professional-grade sound system with DJ equipment.',
      category: 'sound_system',
      price: 750,
      addedAt: '2024-01-14'
    },
    {
      id: '3',
      name: 'Elegant Decorations Package',
      description: 'Beautiful centerpieces, linens, and decorative elements.',
      category: 'decorations',
      price: 800,
      addedAt: '2024-01-13'
    }
  ])

  const removeFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id))
  }

  const getCategoryInfo = (category: string) => {
    return categoryConfig[category] || { icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100', label: category }
  }

  const totalPrice = favorites.reduce((sum, item) => sum + item.price, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
          <p className="text-gray-500 mt-1">Services you've saved for your events</p>
        </div>
        <Link
          href="/customer/services"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          <Package className="w-5 h-5 mr-2" />
          Browse Services
        </Link>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Heart className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No favorites yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Browse our services and save your favorites to easily find them later when booking your event.
          </p>
          <Link
            href="/customer/services"
            className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Package className="w-5 h-5 mr-2" />
            Browse Services
          </Link>
        </div>
      ) : (
        <>
          {/* Favorites List */}
          <div className="grid gap-4">
            {favorites.map((item) => {
              const config = getCategoryInfo(item.category)
              const Icon = config.icon
              
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-start gap-4"
                >
                  <div className={`flex-shrink-0 p-3 rounded-xl ${config.bgColor}`}>
                    <Icon className={`w-6 h-6 ${config.color}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                        <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-lg font-bold text-primary-600">
                          ${item.price.toLocaleString()}
                        </p>
                        <button
                          onClick={() => removeFavorite(item.id)}
                          className="mt-2 inline-flex items-center text-sm text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary Card */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-primary-100">Total for {favorites.length} service{favorites.length > 1 ? 's' : ''}</p>
                <p className="text-3xl font-bold">${totalPrice.toLocaleString()}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <ShoppingCart className="w-8 h-8" />
              </div>
            </div>
            <Link
              href="/customer/book"
              className="block w-full text-center py-3 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Book Event with These Services
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
