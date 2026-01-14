'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { ServiceItem, ServiceItemCategory, Invoice, InvoiceStatus, Message } from '@/types'
import { 
  Package, 
  MessageSquare, 
  DollarSign, 
  Search, 
  Send, 
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
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react'

// Tab types
type TabType = 'services' | 'messages' | 'financial'

// Category icons mapping
const categoryIcons: Record<string, React.ComponentType<any>> = {
  facility: Building2,
  catering: Utensils,
  items: Package,
  security: Shield,
  bar: Wine,
  deposit: DollarSign,
  sound_system: Music,
  av: Mic,
  planning: PartyPopper,
  decorations: Sparkles,
  additional_time: Clock,
  sales_tax: Calculator,
  hosting: Users,
  misc: Grid3x3,
}

// Category colors
const categoryColors: Record<string, string> = {
  facility: 'bg-blue-100 text-blue-600 border-blue-200',
  catering: 'bg-orange-100 text-orange-600 border-orange-200',
  items: 'bg-purple-100 text-purple-600 border-purple-200',
  security: 'bg-red-100 text-red-600 border-red-200',
  bar: 'bg-pink-100 text-pink-600 border-pink-200',
  deposit: 'bg-green-100 text-green-600 border-green-200',
  sound_system: 'bg-indigo-100 text-indigo-600 border-indigo-200',
  av: 'bg-cyan-100 text-cyan-600 border-cyan-200',
  planning: 'bg-yellow-100 text-yellow-600 border-yellow-200',
  decorations: 'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200',
  additional_time: 'bg-slate-100 text-slate-600 border-slate-200',
  sales_tax: 'bg-gray-100 text-gray-600 border-gray-200',
  hosting: 'bg-teal-100 text-teal-600 border-teal-200',
  misc: 'bg-stone-100 text-stone-600 border-stone-200',
}

// Category labels
const categoryLabels: Record<string, string> = {
  facility: 'Facility Rental',
  catering: 'Catering',
  items: 'Items',
  security: 'Security',
  bar: 'Bar Services',
  deposit: 'Deposit',
  sound_system: 'Sound System',
  av: 'Audio/Visual',
  planning: 'Event Planning',
  decorations: 'Decorations',
  additional_time: 'Additional Time',
  sales_tax: 'Sales Tax',
  hosting: 'Hosting Services',
  misc: 'Miscellaneous',
}

export default function ClientAccountPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('services')
  const [loading, setLoading] = useState(true)
  
  // Read tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get('tab')
    if (tabParam && ['services', 'messages', 'financial'].includes(tabParam)) {
      setActiveTab(tabParam as TabType)
    }
  }, [searchParams])
  
  // Services state
  const [services, setServices] = useState<ServiceItem[]>([])
  const [serviceSearch, setServiceSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  
  // Messages state
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  
  // Financial state
  const [invoices, setInvoices] = useState<Invoice[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchServices(),
        fetchMessages(),
        fetchInvoices(),
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchServices = async () => {
    try {
      const response = await api.get<ServiceItem[]>('/service-items')
      setServices(response.data)
    } catch (error) {
      console.error('Failed to fetch services:', error)
      // Fallback sample data for demo
      setServices([
        { id: '1', name: 'Facility Rental', description: 'Full venue rental for your event', category: ServiceItemCategory.FACILITY, defaultPrice: 2500, isActive: true, sortOrder: 1, createdAt: '', updatedAt: '' },
        { id: '2', name: 'Sound System Package', description: 'Professional DJ equipment and speakers', category: ServiceItemCategory.SOUND_SYSTEM, defaultPrice: 500, isActive: true, sortOrder: 2, createdAt: '', updatedAt: '' },
        { id: '3', name: 'Catering Service', description: 'Full catering with servers', category: ServiceItemCategory.CATERING, defaultPrice: 1500, isActive: true, sortOrder: 3, createdAt: '', updatedAt: '' },
        { id: '4', name: 'Bar Service', description: 'Professional bartending service', category: ServiceItemCategory.BAR, defaultPrice: 800, isActive: true, sortOrder: 4, createdAt: '', updatedAt: '' },
        { id: '5', name: 'Security Personnel', description: 'Professional security staff', category: ServiceItemCategory.SECURITY, defaultPrice: 400, isActive: true, sortOrder: 5, createdAt: '', updatedAt: '' },
        { id: '6', name: 'Event Decorations', description: 'Beautiful decorations for your event', category: ServiceItemCategory.DECORATIONS, defaultPrice: 600, isActive: true, sortOrder: 6, createdAt: '', updatedAt: '' },
      ])
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await api.get<Message[]>('/messages', {
        params: user?.id ? { userId: user.id } : {}
      })
      setMessages(response.data)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      setMessages([])
    }
  }

  const fetchInvoices = async () => {
    try {
      const response = await api.get<Invoice[]>('/invoices')
      setInvoices(response.data)
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
      setInvoices([])
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return

    setSendingMessage(true)
    try {
      await api.post('/messages/send', {
        recipientPhone: '', // Will be filled by backend based on owner
        recipientName: 'Venue Owner',
        recipientType: 'custom',
        userId: user.id,
        messageType: 'custom',
        content: newMessage,
      })
      setNewMessage('')
      fetchMessages()
      alert('Message sent successfully!')
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingMessage(false)
    }
  }

  // Filter services
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      service.description.toLowerCase().includes(serviceSearch.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || service.category === categoryFilter
    return matchesSearch && matchesCategory && service.isActive
  })

  // Get unique categories from services
  const availableCategories = [...new Set(services.map(s => s.category))]

  // Calculate financial summary
  const financialSummary = {
    totalInvoiced: invoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0),
    totalPaid: invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0),
    totalDue: invoices.reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0),
    pendingInvoices: invoices.filter(inv => inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.OVERDUE).length,
  }

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.PAID: return 'bg-green-100 text-green-800'
      case InvoiceStatus.SENT: return 'bg-blue-100 text-blue-800'
      case InvoiceStatus.OVERDUE: return 'bg-red-100 text-red-800'
      case InvoiceStatus.DRAFT: return 'bg-gray-100 text-gray-800'
      case InvoiceStatus.CANCELLED: return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Account</h1>
        <p className="text-gray-600 mt-2">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}! Manage your services, messages, and finances.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'services'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="h-5 w-5" />
            Services
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'messages'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            Messages
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'financial'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DollarSign className="h-5 w-5" />
            Financial
          </button>
        </nav>
      </div>

      {/* Services Tab */}
      {activeTab === 'services' && (
        <div>
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search services..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              {availableCategories.map(cat => (
                <option key={cat} value={cat}>
                  {categoryLabels[cat] || cat}
                </option>
              ))}
            </select>
          </div>

          {/* Services Grid */}
          {filteredServices.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No services found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => {
                const Icon = categoryIcons[service.category] || Package
                const colorClass = categoryColors[service.category] || 'bg-gray-100 text-gray-600 border-gray-200'
                
                return (
                  <div
                    key={service.id}
                    className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className={`p-4 ${colorClass.split(' ')[0]}`}>
                      <div className="flex items-center justify-between">
                        <Icon className={`h-8 w-8 ${colorClass.split(' ')[1]}`} />
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                          {categoryLabels[service.category] || service.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg text-gray-900 mb-2">{service.name}</h3>
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">{service.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary-600">
                          ${Number(service.defaultPrice || 0).toLocaleString()}
                        </span>
                        <button
                          onClick={() => router.push('/dashboard/intake')}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          {/* Message Compose */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Send a Message</h3>
            <div className="flex gap-3">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={3}
              />
              <button
                onClick={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed self-end"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Message History */}
          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Message History</h3>
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages yet. Start a conversation!</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`p-4 rounded-lg ${
                      message.userId === user?.id
                        ? 'bg-primary-50 ml-8'
                        : 'bg-gray-50 mr-8'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {message.userId === user?.id ? 'You' : message.recipientName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-gray-700">{message.content}</p>
                    <div className="mt-2 flex items-center gap-2">
                      {message.status === 'delivered' ? (
                        <span className="flex items-center text-xs text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" /> Delivered
                        </span>
                      ) : message.status === 'failed' ? (
                        <span className="flex items-center text-xs text-red-600">
                          <AlertCircle className="h-3 w-3 mr-1" /> Failed
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">{message.status}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div>
          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Invoiced</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${financialSummary.totalInvoiced.toLocaleString()}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Paid</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${financialSummary.totalPaid.toLocaleString()}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Balance Due</p>
                  <p className="text-2xl font-bold text-red-600">
                    ${financialSummary.totalDue.toLocaleString()}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Invoices</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {financialSummary.pendingInvoices}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-lg text-gray-900">Invoices</h3>
            </div>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No invoices yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Invoice #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Due
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
                    {invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {invoice.invoice_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(invoice.issue_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${Number(invoice.total_amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                          ${Number(invoice.amount_paid || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                          ${Number(invoice.amount_due || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                            {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
