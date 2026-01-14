'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import api from '@/lib/api'
import { ServiceItem, ServiceItemCategory } from '@/types'
import { 
  Search, 
  Filter, 
  Heart,
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
  ChevronDown,
  Star,
  Info
} from 'lucide-react'

// Category configuration
const categoryConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string; label: string }> = {
  facility: { icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Facility Rental' },
  catering: { icon: Utensils, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Catering' },
  items: { icon: Package, color: 'text-purple-600', bgColor: 'bg-purple-100', label: 'Items' },
  security: { icon: Shield, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Security' },
  bar: { icon: Wine, color: 'text-pink-600', bgColor: 'bg-pink-100', label: 'Bar Services' },
  deposit: { icon: Calculator, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Deposit' },
  sound_system: { icon: Music, color: 'text-indigo-600', bgColor: 'bg-indigo-100', label: 'Sound System' },
  av: { icon: Mic, color: 'text-cyan-600', bgColor: 'bg-cyan-100', label: 'Audio/Visual' },
  planning: { icon: PartyPopper, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Event Planning' },
  decorations: { icon: Sparkles, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-100', label: 'Decorations' },
  additional_time: { icon: Clock, color: 'text-slate-600', bgColor: 'bg-slate-100', label: 'Additional Time' },
  sales_tax: { icon: Calculator, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Sales Tax' },
  hosting: { icon: Users, color: 'text-teal-600', bgColor: 'bg-teal-100', label: 'Hosting Services' },
  misc: { icon: Grid3x3, color: 'text-stone-600', bgColor: 'bg-stone-100', label: 'Miscellaneous' },
}

interface FavoriteService {
  id: string
  serviceId: string
}

export default function CustomerServicesPage() {
  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState<ServiceItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high'>('name')
  const [favorites, setFavorites] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await api.get<ServiceItem[]>('/service-items')
      setServices(response.data.filter(s => s.isActive))
    } catch (error) {
      console.error('Failed to fetch services:', error)
      // Set mock data for demo
      setServices([
        { id: '1', name: 'Grand Ballroom Rental', description: 'Our largest venue space, perfect for weddings and galas. Features elegant chandeliers, hardwood floors, and panoramic views.', category: ServiceItemCategory.FACILITY, defaultPrice: 3500, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '2', name: 'Garden Room Rental', description: 'Intimate space with natural lighting and garden views. Ideal for smaller gatherings and corporate meetings.', category: ServiceItemCategory.FACILITY, defaultPrice: 1500, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '3', name: 'Premium Sound System', description: 'Professional-grade sound system with DJ equipment, wireless microphones, and Bluetooth connectivity.', category: ServiceItemCategory.SOUND_SYSTEM, defaultPrice: 750, isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '4', name: 'Full Catering Package', description: 'Complete catering service including appetizers, main course, dessert, and professional servers.', category: ServiceItemCategory.CATERING, defaultPrice: 45, isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '5', name: 'Premium Bar Service', description: 'Full bar setup with professional bartenders, premium spirits, and cocktail menu.', category: ServiceItemCategory.BAR, defaultPrice: 1200, isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },
        { id: '6', name: 'Security Personnel', description: 'Trained security staff for event safety and crowd management. Price per guard per hour.', category: ServiceItemCategory.SECURITY, defaultPrice: 35, isActive: true, sortOrder: 6, createdAt: '', updatedAt: '' },
        { id: '7', name: 'Elegant Decorations Package', description: 'Beautiful centerpieces, linens, and decorative elements to transform your venue.', category: ServiceItemCategory.DECORATIONS, defaultPrice: 800, isActive: true, sortOrder: 7, createdAt: '', updatedAt: '' },
        { id: '8', name: 'Additional Hour', description: 'Extend your event with additional hours. Includes all staff and services.', category: ServiceItemCategory.ADDITIONAL_TIME, defaultPrice: 500, isActive: true, sortOrder: 8, createdAt: '', updatedAt: '' },
        { id: '9', name: 'AV Equipment Package', description: 'Projector, screens, and technical support for presentations and slideshows.', category: ServiceItemCategory.AV, defaultPrice: 400, isActive: true, sortOrder: 9, createdAt: '', updatedAt: '' },
        { id: '10', name: 'Event Coordinator', description: 'Dedicated event coordinator to manage all details and ensure your event runs smoothly.', category: ServiceItemCategory.PLANNING, defaultPrice: 1000, isActive: true, sortOrder: 10, createdAt: '', updatedAt: '' },
      ])
    } finally {
      setLoading(false)
    }
  }

  const toggleFavorite = (serviceId: string) => {
    setFavorites(prev => 
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  // Get unique categories
  const availableCategories = [...new Set(services.map(s => s.category))]

  // Filter and sort services
  const filteredServices = services
    .filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
      return matchesSearch && matchesCategory
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low': return (a.defaultPrice || 0) - (b.defaultPrice || 0)
        case 'price-high': return (b.defaultPrice || 0) - (a.defaultPrice || 0)
        default: return a.name.localeCompare(b.name)
      }
    })

  const getCategoryInfo = (category: string) => {
    return categoryConfig[category] || { icon: Package, color: 'text-gray-600', bgColor: 'bg-gray-100', label: category }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Services</h1>
          <p className="text-gray-500 mt-1">Explore our available services and add-ons for your event</p>
        </div>
        <Link
          href="/customer/book"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Book an Event
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full lg:w-48 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {getCategoryInfo(cat).label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          </div>
          
          {/* Sort */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full lg:w-44 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
            >
              <option value="name">Sort by Name</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 pointer-events-none" />
          </div>
        </div>
        
        {/* Active Filters */}
        {(searchQuery || selectedCategory !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">Active filters:</span>
            {searchQuery && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')} className="ml-2 hover:text-primary-900">×</button>
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary-100 text-primary-700">
                {getCategoryInfo(selectedCategory).label}
                <button onClick={() => setSelectedCategory('all')} className="ml-2 hover:text-primary-900">×</button>
              </span>
            )}
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Category Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All Services
        </button>
        {availableCategories.slice(0, 6).map(cat => {
          const config = getCategoryInfo(cat)
          const Icon = config.icon
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {config.label}
            </button>
          )
        })}
      </div>

      {/* Services Grid */}
      {filteredServices.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <Package className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
          <p className="text-gray-500 mb-4">Try adjusting your search or filter criteria.</p>
          <button
            onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
            className="text-primary-600 font-medium hover:text-primary-700"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => {
            const config = getCategoryInfo(service.category)
            const Icon = config.icon
            const isFavorite = favorites.includes(service.id)
            
            return (
              <div
                key={service.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all group"
              >
                {/* Category Header */}
                <div className={`${config.bgColor} p-4`}>
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl bg-white/50 ${config.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium bg-white/80 ${config.color}`}>
                        {config.label}
                      </span>
                      <button
                        onClick={() => toggleFavorite(service.id)}
                        className={`p-2 rounded-full transition-colors ${
                          isFavorite 
                            ? 'bg-red-100 text-red-500' 
                            : 'bg-white/50 text-gray-400 hover:text-red-500'
                        }`}
                      >
                        <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Starting at</p>
                      <p className="text-2xl font-bold text-primary-600">
                        ${Number(service.defaultPrice || 0).toLocaleString()}
                        {service.category === ServiceItemCategory.CATERING && <span className="text-sm font-normal text-gray-500">/person</span>}
                        {service.category === ServiceItemCategory.SECURITY && <span className="text-sm font-normal text-gray-500">/hour</span>}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedService(service)}
                      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      <Info className="w-4 h-4 mr-1.5" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Results Count */}
      <div className="text-center text-sm text-gray-500">
        Showing {filteredServices.length} of {services.length} services
      </div>

      {/* Service Details Modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setSelectedService(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full">
              {/* Header */}
              <div className={`${getCategoryInfo(selectedService.category).bgColor} p-6 rounded-t-2xl`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const Icon = getCategoryInfo(selectedService.category).icon
                      return (
                        <div className={`p-3 rounded-xl bg-white/50 ${getCategoryInfo(selectedService.category).color}`}>
                          <Icon className="h-8 w-8" />
                        </div>
                      )
                    })()}
                    <div>
                      <span className={`text-xs font-medium ${getCategoryInfo(selectedService.category).color}`}>
                        {getCategoryInfo(selectedService.category).label}
                      </span>
                      <h2 className="text-xl font-bold text-gray-900">{selectedService.name}</h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedService(null)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Description</h3>
                  <p className="text-gray-700">{selectedService.description}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Pricing</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary-600">
                      ${Number(selectedService.defaultPrice || 0).toLocaleString()}
                    </span>
                    {selectedService.category === ServiceItemCategory.CATERING && (
                      <span className="text-gray-500">per person</span>
                    )}
                    {selectedService.category === ServiceItemCategory.SECURITY && (
                      <span className="text-gray-500">per hour</span>
                    )}
                    {selectedService.category === ServiceItemCategory.ADDITIONAL_TIME && (
                      <span className="text-gray-500">per hour</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    *Final pricing may vary based on your event requirements
                  </p>
                </div>
                
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={() => toggleFavorite(selectedService.id)}
                    className={`flex-shrink-0 p-3 rounded-xl border transition-colors ${
                      favorites.includes(selectedService.id)
                        ? 'border-red-200 bg-red-50 text-red-500'
                        : 'border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${favorites.includes(selectedService.id) ? 'fill-current' : ''}`} />
                  </button>
                  <Link
                    href="/customer/book"
                    onClick={() => setSelectedService(null)}
                    className="flex-1 inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Add to Booking
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
