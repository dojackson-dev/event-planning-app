'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Eye,
  MessageSquare,
  FileText,
  ChevronRight,
  Filter,
  Sparkles,
  PartyPopper
} from 'lucide-react'

interface CustomerEvent {
  id: string
  event_type: string
  event_date: string
  start_time?: string
  end_time?: string
  venue_name?: string
  status: string
  guest_count: number
  estimated_total?: number
  notes?: string
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  created_at: string
}

type FilterType = 'all' | 'upcoming' | 'past' | 'pending'

export default function CustomerEventsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CustomerEvent[]>([])
  const [filter, setFilter] = useState<FilterType>('all')
  const [selectedEvent, setSelectedEvent] = useState<CustomerEvent | null>(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const response = await api.get('/intake-forms')
      const intakeForms = response.data || []
      
      // Transform intake forms to events
      const customerEvents: CustomerEvent[] = intakeForms.map((form: any) => ({
        id: form.id,
        event_type: form.event_type,
        event_date: form.event_date,
        start_time: form.start_time,
        end_time: form.end_time,
        venue_name: 'DoVenue Event Center',
        status: form.status,
        guest_count: form.guest_count,
        estimated_total: form.estimated_total,
        notes: form.notes,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        created_at: form.created_at
      }))
      
      setEvents(customerEvents)
    } catch (error) {
      console.error('Failed to fetch events:', error)
      // Set mock data for demo
      setEvents([
        {
          id: '1',
          event_type: 'wedding_reception',
          event_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          start_time: '18:00',
          end_time: '23:00',
          venue_name: 'DoVenue Event Center - Grand Ballroom',
          status: 'confirmed',
          guest_count: 150,
          estimated_total: 8500,
          contact_name: 'John Doe',
          contact_email: 'john@example.com',
          contact_phone: '555-123-4567',
          created_at: new Date().toISOString()
        },
        {
          id: '2',
          event_type: 'birthday_party',
          event_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
          start_time: '14:00',
          end_time: '18:00',
          venue_name: 'DoVenue Event Center - Garden Room',
          status: 'pending',
          guest_count: 50,
          estimated_total: 2500,
          contact_name: 'John Doe',
          contact_email: 'john@example.com',
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setLoading(false)
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const getDaysUntilEvent = (dateString: string) => {
    const eventDate = new Date(dateString)
    const today = new Date()
    const diffTime = eventDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'confirmed': return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle }
      case 'pending': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock }
      case 'new': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: Sparkles }
      case 'completed': return { bg: 'bg-gray-100', text: 'text-gray-700', icon: CheckCircle }
      case 'cancelled': return { bg: 'bg-red-100', text: 'text-red-700', icon: AlertCircle }
      default: return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock }
    }
  }

  const filteredEvents = events.filter(event => {
    const eventDate = new Date(event.event_date)
    const today = new Date()
    
    switch (filter) {
      case 'upcoming':
        return eventDate >= today && event.status !== 'cancelled'
      case 'past':
        return eventDate < today
      case 'pending':
        return event.status === 'pending' || event.status === 'new'
      default:
        return true
    }
  })

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
          <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
          <p className="text-gray-500 mt-1">View and manage your booked events</p>
        </div>
        <Link
          href="/customer/book"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Book New Event
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 inline-flex">
        {[
          { id: 'all', label: 'All Events' },
          { id: 'upcoming', label: 'Upcoming' },
          { id: 'pending', label: 'Pending' },
          { id: 'past', label: 'Past' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as FilterType)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === tab.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <PartyPopper className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No events found</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {filter === 'all' 
              ? "You haven't booked any events yet. Start planning your celebration today!"
              : `No ${filter} events to display.`
            }
          </p>
          <Link
            href="/customer/book"
            className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Book Your First Event
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredEvents.map((event) => {
            const status = getStatusStyle(event.status)
            const StatusIcon = status.icon
            const daysUntil = getDaysUntilEvent(event.event_date)
            const isPast = daysUntil < 0
            
            return (
              <div
                key={event.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Date Badge */}
                    <div className={`flex-shrink-0 ${isPast ? 'bg-gray-100' : 'bg-primary-100'} rounded-xl p-4 text-center min-w-[80px]`}>
                      <p className={`text-xs font-medium ${isPast ? 'text-gray-600' : 'text-primary-600'}`}>
                        {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                      </p>
                      <p className={`text-3xl font-bold ${isPast ? 'text-gray-700' : 'text-primary-700'}`}>
                        {new Date(event.event_date).getDate()}
                      </p>
                      <p className={`text-xs ${isPast ? 'text-gray-500' : 'text-primary-600'}`}>
                        {new Date(event.event_date).getFullYear()}
                      </p>
                    </div>
                    
                    {/* Event Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {formatEventType(event.event_type)}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                            </span>
                            {!isPast && (
                              <span className={`text-xs font-medium ${daysUntil <= 7 ? 'text-orange-600' : 'text-gray-500'}`}>
                                {daysUntil === 0 ? '🎉 Today!' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days away`}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {event.estimated_total && (
                          <div className="text-right hidden sm:block">
                            <p className="text-sm text-gray-500">Estimated Total</p>
                            <p className="text-xl font-bold text-gray-900">
                              ${event.estimated_total.toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {/* Event Info Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{event.venue_name}</span>
                        </div>
                        {event.start_time && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{formatTime(event.start_time)} - {event.end_time ? formatTime(event.end_time) : 'TBD'}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span>{event.guest_count} guests</span>
                        </div>
                        {event.estimated_total && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 sm:hidden">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            <span>${event.estimated_total.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions Footer */}
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setSelectedEvent(event)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    View Details
                  </button>
                  <Link
                    href="/customer/messages"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Message Venue
                  </Link>
                  <Link
                    href="/customer/contracts"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    View Contract
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setSelectedEvent(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {formatEventType(selectedEvent.event_type)}
                    </h2>
                    <p className="text-gray-500 mt-1">{formatDate(selectedEvent.event_date)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Status */}
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Status</h3>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusStyle(selectedEvent.status).bg} ${getStatusStyle(selectedEvent.status).text}`}>
                    {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                  </span>
                </div>
                
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Venue</h3>
                    <p className="text-gray-900">{selectedEvent.venue_name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Expected Guests</h3>
                    <p className="text-gray-900">{selectedEvent.guest_count} people</p>
                  </div>
                  {selectedEvent.start_time && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Event Time</h3>
                      <p className="text-gray-900">
                        {formatTime(selectedEvent.start_time)} - {selectedEvent.end_time ? formatTime(selectedEvent.end_time) : 'TBD'}
                      </p>
                    </div>
                  )}
                  {selectedEvent.estimated_total && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 mb-1">Estimated Total</h3>
                      <p className="text-2xl font-bold text-primary-600">
                        ${selectedEvent.estimated_total.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Contact Info */}
                {selectedEvent.contact_name && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <p className="text-gray-900">{selectedEvent.contact_name}</p>
                      {selectedEvent.contact_email && (
                        <p className="text-gray-600 text-sm">{selectedEvent.contact_email}</p>
                      )}
                      {selectedEvent.contact_phone && (
                        <p className="text-gray-600 text-sm">{selectedEvent.contact_phone}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {selectedEvent.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
                    <p className="text-gray-700 bg-gray-50 rounded-lg p-4">{selectedEvent.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-gray-200 flex flex-wrap gap-3">
                <Link
                  href="/customer/messages"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  Contact Venue
                </Link>
                <Link
                  href="/customer/finances"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  <DollarSign className="w-5 h-5 mr-2" />
                  View Payments
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
