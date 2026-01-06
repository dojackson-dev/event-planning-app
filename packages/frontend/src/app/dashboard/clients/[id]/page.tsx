'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Calendar, Mail, Phone, Users, Clock, MapPin, Utensils, Wrench, Heart, Accessibility, DollarSign, Info, CheckCircle, MessageSquare, FileText, Clock as ClockIcon } from 'lucide-react'

interface IntakeForm {
  id: string
  user_id: string
  event_type: string
  event_date: string
  event_time: string
  guest_count: number
  contact_name: string
  contact_email: string
  contact_phone: string
  services_needed: string
  venue_preference: string | null
  catering_requirements: string | null
  equipment_needs: string | null
  special_requests: string | null
  dietary_restrictions: string | null
  accessibility_requirements: string | null
  budget_range: string | null
  how_did_you_hear: string | null
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<IntakeForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('')
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [appointmentData, setAppointmentData] = useState({ date: '', time: '', notes: '' })

  useEffect(() => {
    if (params.id) {
      fetchClient()
    }
  }, [params.id])

  const fetchClient = async () => {
    try {
      const response = await api.get<IntakeForm>(`/intake-forms/${params.id}`)
      setClient(response.data)
      setStatus(response.data.status)
      setNotes(response.data.notes || '')
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!client) return
    
    setUpdating(true)
    try {
      await api.put(`/intake-forms/${client.id}`, {
        status,
        notes
      })
      await fetchClient()
      alert('Client updated successfully!')
    } catch (error) {
      console.error('Error updating client:', error)
      alert('Error updating client')
    } finally {
      setUpdating(false)
    }
  }

  const handleConvertToBooking = async () => {
    if (!client) return
    
    if (!confirm('Are you sure you want to convert this intake form to a booking? This will create a new event and booking.')) {
      return
    }
    
    setUpdating(true)
    try {
      const response = await api.post(`/intake-forms/${client.id}/convert-to-booking`, {})
      alert('Successfully converted to booking!')
      // Redirect to the bookings page
      router.push('/dashboard/bookings')
    } catch (error: any) {
      console.error('Error converting to booking:', error)
      alert(error.response?.data?.message || 'Error converting to booking')
    } finally {
      setUpdating(false)
    }
  }

  const handleSendMessage = async () => {
    if (!client || !messageContent.trim()) return
    try {
      // TODO: Implement message API endpoint
      console.log('Sending message to', client.contact_email, ':', messageContent)
      alert('Message sent successfully!')
      setShowMessageModal(false)
      setMessageContent('')
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    }
  }

  const handleSendInvoice = async () => {
    if (!client) return
    try {
      // TODO: Implement invoice sending API endpoint
      console.log('Sending invoice to', client.contact_email)
      alert('Invoice sent successfully!')
      setShowInvoiceModal(false)
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Failed to send invoice')
    }
  }

  const handleMakeAppointment = async () => {
    if (!client || !appointmentData.date || !appointmentData.time) return
    try {
      // TODO: Implement appointment API endpoint
      console.log('Creating appointment for', client.contact_name, ':', appointmentData)
      alert('Appointment scheduled successfully!')
      setShowAppointmentModal(false)
      setAppointmentData({ date: '', time: '', notes: '' })
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Failed to create appointment')
    }
  }

  const formatEventType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'converted': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client details...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Client not found</p>
          <button
            onClick={() => router.push('/dashboard/clients')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            Back to Clients
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/clients')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Clients
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{client.contact_name}</h1>
              <p className="mt-2 text-gray-600">
                Submitted on {formatDate(client.created_at)}
              </p>
            </div>
            <span className={`px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(client.status)}`}>
              {client.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <a href={`mailto:${client.contact_email}`} className="text-blue-600 hover:text-blue-800">
                    {client.contact_email}
                  </a>
                </div>
                {client.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-gray-400" />
                    <a href={`tel:${client.contact_phone}`} className="text-blue-600 hover:text-blue-800">
                      {client.contact_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Event Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Event Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Event Type</p>
                    <p className="font-medium">{formatEventType(client.event_type)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium">{formatDate(client.event_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-medium">{client.event_time || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Guest Count</p>
                    <p className="font-medium">{client.guest_count}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Services & Requirements */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Services & Requirements</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-gray-400" />
                    <p className="font-medium text-gray-900">Services Needed</p>
                  </div>
                  <p className="text-gray-700 ml-7">{client.services_needed || 'Not specified'}</p>
                </div>

                {client.venue_preference && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <p className="font-medium text-gray-900">Venue Preference</p>
                    </div>
                    <p className="text-gray-700 ml-7">{client.venue_preference}</p>
                  </div>
                )}

                {client.catering_requirements && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Utensils className="h-5 w-5 text-gray-400" />
                      <p className="font-medium text-gray-900">Catering Requirements</p>
                    </div>
                    <p className="text-gray-700 ml-7">{client.catering_requirements}</p>
                  </div>
                )}

                {client.equipment_needs && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Wrench className="h-5 w-5 text-gray-400" />
                      <p className="font-medium text-gray-900">Equipment Needs</p>
                    </div>
                    <p className="text-gray-700 ml-7">{client.equipment_needs}</p>
                  </div>
                )}

                {client.dietary_restrictions && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="h-5 w-5 text-gray-400" />
                      <p className="font-medium text-gray-900">Dietary Restrictions</p>
                    </div>
                    <p className="text-gray-700 ml-7">{client.dietary_restrictions}</p>
                  </div>
                )}

                {client.accessibility_requirements && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Accessibility className="h-5 w-5 text-gray-400" />
                      <p className="font-medium text-gray-900">Accessibility Requirements</p>
                    </div>
                    <p className="text-gray-700 ml-7">{client.accessibility_requirements}</p>
                  </div>
                )}

                {client.special_requests && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Info className="h-5 w-5 text-gray-400" />
                      <p className="font-medium text-gray-900">Special Requests</p>
                    </div>
                    <p className="text-gray-700 ml-7">{client.special_requests}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Budget & Source */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Information</h2>
              <div className="space-y-3">
                {client.budget_range && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Budget Range</p>
                      <p className="font-medium">{client.budget_range}</p>
                    </div>
                  </div>
                )}
                {client.how_did_you_hear && (
                  <div className="flex items-center gap-3">
                    <Info className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">How They Heard About Us</p>
                      <p className="font-medium">{client.how_did_you_hear}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Management */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Management</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="converted">Converted</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Add notes about this client..."
                  />
                </div>

                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                <button
                  onClick={handleConvertToBooking}
                  disabled={updating || client.status === 'converted'}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  {client.status === 'converted' 
                    ? 'Already Converted' 
                    : updating 
                    ? 'Converting...' 
                    : 'Convert to Booking'}
                </button>

                <button
                  onClick={() => setShowMessageModal(true)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send Message
                </button>

                <button
                  onClick={() => setShowInvoiceModal(true)}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Send Invoice
                </button>

                <button
                  onClick={() => setShowAppointmentModal(true)}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center justify-center gap-2"
                >
                  <ClockIcon className="h-4 w-4" />
                  Make Appointment
                </button>

                <button
                  onClick={() => window.location.href = `mailto:${client.contact_email}`}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </button>
                <button
                  onClick={() => window.location.href = `tel:${client.contact_phone}`}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                  disabled={!client.contact_phone}
                >
                  <Phone className="h-4 w-4" />
                  Call Client
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Form Submitted</p>
                    <p className="text-xs text-gray-600">{formatDate(client.created_at)}</p>
                  </div>
                </div>
                {client.updated_at !== client.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <Clock className="h-4 w-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Last Updated</p>
                      <p className="text-xs text-gray-600">{formatDate(client.updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Message Modal */}
        {showMessageModal && client && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Send Message to {client.contact_name}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={client.contact_email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowMessageModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Modal */}
        {showInvoiceModal && client && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Send Invoice to {client.contact_name}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={client.contact_email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Invoice</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="">-- Select an invoice --</option>
                    <option value="1">Invoice #INV-001</option>
                    <option value="2">Invoice #INV-002</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600">The invoice will be sent to the client's email address.</p>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvoice}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Send Invoice
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Appointment Modal */}
        {showAppointmentModal && client && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Schedule Appointment with {client.contact_name}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <input
                    type="text"
                    value={client.contact_name}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={appointmentData.date}
                    onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={appointmentData.time}
                    onChange={(e) => setAppointmentData({ ...appointmentData, time: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea
                    value={appointmentData.notes}
                    onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                    placeholder="Add appointment notes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowAppointmentModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMakeAppointment}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                  >
                    Schedule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
