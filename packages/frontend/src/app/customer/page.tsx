'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { Invoice, InvoiceStatus, Event } from '@/types'
import { 
  Calendar, 
  MessageSquare, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  ArrowRight, 
  Package,
  FileText,
  AlertCircle,
  TrendingUp,
  Bell,
  Sparkles,
  PartyPopper
} from 'lucide-react'

interface CustomerEvent {
  id: string
  event_type: string
  event_date: string
  venue_name?: string
  status: string
  guest_count: number
  total_amount?: number
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success'
  time: string
  read: boolean
}

export default function CustomerDashboardPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState<CustomerEvent[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch customer's events (intake forms)
      const intakeRes = await api.get('/intake-forms')
      const intakeForms = intakeRes.data || []
      
      // Transform intake forms to events
      const events: CustomerEvent[] = intakeForms.map((form: any) => ({
        id: form.id,
        event_type: form.event_type,
        event_date: form.event_date,
        venue_name: 'DoVenue Event Center',
        status: form.status,
        guest_count: form.guest_count,
        total_amount: form.estimated_total
      }))
      
      // Filter to upcoming events
      const upcoming = events.filter(e => new Date(e.event_date) >= new Date())
      setUpcomingEvents(upcoming.slice(0, 3))

      // Fetch invoices
      const invoicesRes = await api.get('/invoices')
      setInvoices(invoicesRes.data || [])

      // Mock notifications (would come from API)
      setNotifications([
        {
          id: '1',
          title: 'Contract Ready',
          message: 'Your contract for the wedding reception is ready to sign.',
          type: 'info',
          time: '2 hours ago',
          read: false
        },
        {
          id: '2',
          title: 'Payment Received',
          message: 'Your deposit payment of $500 has been received.',
          type: 'success',
          time: '1 day ago',
          read: true
        },
        {
          id: '3',
          title: 'Upcoming Event',
          message: 'Your event is in 7 days! Don\'t forget to submit your guest list.',
          type: 'warning',
          time: '2 days ago',
          read: false
        }
      ])

      setUnreadMessages(2)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      // Set mock data for demo
      setUpcomingEvents([
        {
          id: '1',
          event_type: 'Wedding Reception',
          event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          venue_name: 'DoVenue Event Center',
          status: 'confirmed',
          guest_count: 150,
          total_amount: 8500
        }
      ])
      setNotifications([
        {
          id: '1',
          title: 'Welcome!',
          message: 'Thank you for choosing DoVenue. Start planning your event today!',
          type: 'info',
          time: 'Just now',
          read: false
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Calculate financial summary
  const financialSummary = {
    totalDue: invoices.reduce((sum, inv) => sum + Number(inv.amount_due || 0), 0),
    nextPaymentDue: invoices.find(inv => inv.status === InvoiceStatus.SENT)?.due_date,
    overdueCount: invoices.filter(inv => inv.status === InvoiceStatus.OVERDUE).length
  }

  // Get status styles
  const getEventStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700'
      case 'pending': return 'bg-yellow-100 text-yellow-700'
      case 'new': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default: return <Bell className="h-5 w-5 text-blue-500" />
    }
  }

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getDaysUntilEvent = (dateString: string) => {
    const eventDate = new Date(dateString)
    const today = new Date()
    const diffTime = eventDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10">
          <PartyPopper className="w-48 h-48 -mr-12 -mt-12" />
        </div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, {user?.firstName || 'Guest'}! 🎉
          </h1>
          <p className="text-primary-100 mb-4 max-w-xl">
            {upcomingEvents.length > 0 
              ? `You have ${upcomingEvents.length} upcoming event${upcomingEvents.length > 1 ? 's' : ''}. Let's make them unforgettable!`
              : 'Ready to plan your next celebration? Browse our services and book your event today!'
            }
          </p>
          <div className="flex flex-wrap gap-3">
            {upcomingEvents.length === 0 ? (
              <Link
                href="/customer/book"
                className="inline-flex items-center px-5 py-2.5 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Book an Event
              </Link>
            ) : (
              <Link
                href="/customer/events"
                className="inline-flex items-center px-5 py-2.5 bg-white text-primary-600 rounded-lg font-semibold hover:bg-primary-50 transition-colors"
              >
                View My Events
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            )}
            <Link
              href="/customer/services"
              className="inline-flex items-center px-5 py-2.5 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-400 transition-colors"
            >
              <Package className="w-5 h-5 mr-2" />
              Browse Services
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Upcoming Events</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{upcomingEvents.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unread Messages</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{unreadMessages}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <MessageSquare className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Balance Due</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ${financialSummary.totalDue.toLocaleString()}
              </p>
            </div>
            <div className={`${financialSummary.overdueCount > 0 ? 'bg-red-100' : 'bg-yellow-100'} p-3 rounded-xl`}>
              <DollarSign className={`h-6 w-6 ${financialSummary.overdueCount > 0 ? 'text-red-600' : 'text-yellow-600'}`} />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Contracts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {invoices.filter(i => i.status !== InvoiceStatus.CANCELLED).length}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link href="/customer/events" className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center">
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          {upcomingEvents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">No upcoming events</h3>
              <p className="text-gray-500 text-sm mb-4">You haven't booked any events yet.</p>
              <Link
                href="/customer/book"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Book Your First Event
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {upcomingEvents.map((event) => {
                const daysUntil = getDaysUntilEvent(event.event_date)
                return (
                  <div key={event.id} className="p-5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="bg-primary-100 rounded-xl p-3 text-center min-w-[60px]">
                          <p className="text-xs text-primary-600 font-medium">
                            {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                          </p>
                          <p className="text-2xl font-bold text-primary-700">
                            {new Date(event.event_date).getDate()}
                          </p>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{formatEventType(event.event_type)}</h3>
                          <p className="text-sm text-gray-500 mt-0.5">{event.venue_name}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-500">
                              {event.guest_count} guests
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getEventStatusStyle(event.status)}`}>
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-medium ${daysUntil <= 7 ? 'text-orange-600' : 'text-gray-600'}`}>
                          {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                        </span>
                        {event.total_amount && (
                          <p className="text-xs text-gray-500 mt-1">
                            ${event.total_amount.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Notifications & Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
          </div>
          
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 hover:bg-gray-50 transition-colors ${!notification.read ? 'bg-blue-50/50' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link
          href="/customer/services"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition-all group"
        >
          <div className="bg-orange-100 rounded-xl p-3 w-fit mb-3 group-hover:bg-orange-200 transition-colors">
            <Package className="h-6 w-6 text-orange-600" />
          </div>
          <h3 className="font-medium text-gray-900">Browse Services</h3>
          <p className="text-xs text-gray-500 mt-1">View available add-ons</p>
        </Link>
        
        <Link
          href="/customer/messages"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition-all group"
        >
          <div className="bg-green-100 rounded-xl p-3 w-fit mb-3 group-hover:bg-green-200 transition-colors">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-medium text-gray-900">Messages</h3>
          <p className="text-xs text-gray-500 mt-1">Chat with the venue</p>
        </Link>
        
        <Link
          href="/customer/finances"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition-all group"
        >
          <div className="bg-blue-100 rounded-xl p-3 w-fit mb-3 group-hover:bg-blue-200 transition-colors">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-medium text-gray-900">Payments</h3>
          <p className="text-xs text-gray-500 mt-1">View invoices & pay</p>
        </Link>
        
        <Link
          href="/customer/contracts"
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-primary-200 transition-all group"
        >
          <div className="bg-purple-100 rounded-xl p-3 w-fit mb-3 group-hover:bg-purple-200 transition-colors">
            <FileText className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="font-medium text-gray-900">Contracts</h3>
          <p className="text-xs text-gray-500 mt-1">Review & sign</p>
        </Link>
      </div>
    </div>
  )
}
