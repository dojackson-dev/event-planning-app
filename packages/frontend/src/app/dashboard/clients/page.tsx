'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import type { Invoice } from '@/types'
import { User, Calendar, Mail, Phone, Clock, Eye, CheckCircle, Search, MessageSquare, FileText, Clock as ClockIcon, Trash2, Zap } from 'lucide-react'

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

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<IntakeForm[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'new' | 'contacted' | 'converted'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClient, setSelectedClient] = useState<IntakeForm | null>(null)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [showInvoiceModal, setShowInvoiceModal] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [appointmentData, setAppointmentData] = useState({ date: '', time: '', duration: '60', notes: '' })
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await api.get<IntakeForm[]>('/intake-forms')
      setClients(response.data)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClientInvoices = async (clientId: string) => {
    setLoadingInvoices(true)
    setClientInvoices([])
    setSelectedInvoiceId('')
    try {
      const response = await api.get<Invoice[]>(`/invoices?intakeFormId=${clientId}`)
      setClientInvoices(response.data)
    } catch (error) {
      console.error('Error fetching client invoices:', error)
    } finally {
      setLoadingInvoices(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedClient || !messageContent.trim()) return
    if (!selectedClient.contact_phone) {
      alert('This client has no phone number on file. SMS cannot be sent.')
      return
    }
    try {
      await api.post('/messages/send', {
        recipientPhone: selectedClient.contact_phone,
        recipientName: selectedClient.contact_name,
        recipientType: 'client',
        messageType: 'custom',
        content: messageContent,
        skipOptInCheck: true,
      })
      alert('SMS sent successfully!')
      setShowMessageModal(false)
      setMessageContent('')
    } catch (error: any) {
      console.error('Error sending SMS:', error)
      alert(error.response?.data?.message || 'Failed to send SMS')
    }
  }

  const handleSendInvoice = async () => {
    if (!selectedClient || !selectedInvoiceId) return
    try {
      // TODO: Implement invoice sending API endpoint
      console.log('Sending invoice', selectedInvoiceId, 'to', selectedClient.contact_email)
      alert('Invoice sent successfully!')
      setShowInvoiceModal(false)
      setSelectedInvoiceId('')
      setClientInvoices([])
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert('Failed to send invoice')
    }
  }

  const handleMakeAppointment = async () => {
    if (!selectedClient || !appointmentData.date || !appointmentData.time) return
    try {
      await api.post('/appointments', {
        intake_form_id: selectedClient.id,
        client_name: selectedClient.contact_name,
        client_email: selectedClient.contact_email,
        client_phone: selectedClient.contact_phone || null,
        appointment_date: appointmentData.date,
        appointment_time: appointmentData.time,
        duration_minutes: parseInt(appointmentData.duration) || 60,
        notes: appointmentData.notes || null,
        status: 'scheduled',
      })
      alert('Appointment scheduled successfully!')
      setShowAppointmentModal(false)
      setAppointmentData({ date: '', time: '', duration: '60', notes: '' })
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Failed to create appointment')
    }
  }

  const handleActivateLead = async (client: IntakeForm) => {
    if (!confirm(`Activate "${client.contact_name}" as a booking?`)) return
    setActivatingId(client.id)
    try {
      await api.post(`/intake-forms/${client.id}/convert-to-booking`, {})
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: 'converted' } : c))
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to activate lead')
    } finally {
      setActivatingId(null)
    }
  }

  const handleDeleteClient = async (client: IntakeForm) => {
    if (!confirm(`Delete "${client.contact_name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/intake-forms/${client.id}`)
      setClients(prev => prev.filter(c => c.id !== client.id))
    } catch (error) {
      console.error('Error deleting client:', error)
      alert('Failed to delete client')
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesFilter = filter === 'all' || client.status === filter
    const matchesSearch = searchTerm === '' || 
      client.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.contact_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.contact_phone && client.contact_phone.includes(searchTerm))
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'contacted': return 'bg-yellow-100 text-yellow-800'
      case 'converted': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatEventType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading clients...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Clients & Leads</h1>
              <p className="text-xs text-gray-500">{clients.length} total</p>
            </div>
          </div>
          {/* Search */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search name, email, or phone…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-gray-400 hover:text-gray-600 text-lg leading-none">
                ✕
              </button>
            )}
          </div>
          {/* Filter chips */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1 scrollbar-hide">
            {(['all', 'new', 'contacted', 'converted'] as const).map((f) => {
              const count = f === 'all' ? clients.length : clients.filter(c => c.status === f).length
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <button
            onClick={() => setFilter('all')}
            className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left transition-all touch-manipulation hover:shadow-md active:scale-95 ${filter === 'all' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="bg-blue-50 rounded-xl p-2 flex-shrink-0">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{clients.length}</p>
            </div>
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left transition-all touch-manipulation hover:shadow-md active:scale-95 ${filter === 'new' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <div className="bg-blue-50 rounded-xl p-2 flex-shrink-0">
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">New</p>
              <p className="text-xl font-bold text-blue-600">{clients.filter(c => c.status === 'new').length}</p>
            </div>
          </button>
          <button
            onClick={() => setFilter('contacted')}
            className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left transition-all touch-manipulation hover:shadow-md active:scale-95 ${filter === 'contacted' ? 'ring-2 ring-yellow-500' : ''}`}
          >
            <div className="bg-yellow-50 rounded-xl p-2 flex-shrink-0">
              <Mail className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Contacted</p>
              <p className="text-xl font-bold text-yellow-600">{clients.filter(c => c.status === 'contacted').length}</p>
            </div>
          </button>
          <button
            onClick={() => setFilter('converted')}
            className={`bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 text-left transition-all touch-manipulation hover:shadow-md active:scale-95 ${filter === 'converted' ? 'ring-2 ring-green-500' : ''}`}
          >
            <div className="bg-green-50 rounded-xl p-2 flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Converted</p>
              <p className="text-xl font-bold text-green-600">{clients.filter(c => c.status === 'converted').length}</p>
            </div>
          </button>
        </div>

        {/* Clients grid */}
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No clients found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <div
                key={client.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col"
              >
                {/* Status stripe */}
                <div className={`h-1 w-full ${
                  client.status === 'new' ? 'bg-blue-400' :
                  client.status === 'contacted' ? 'bg-yellow-400' :
                  client.status === 'converted' ? 'bg-green-400' :
                  'bg-gray-300'
                }`} />

                {/* Card body */}
                <div className="p-4 flex-1 flex flex-col">
                  {/* Name + status + delete */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-base font-bold text-gray-900 leading-snug truncate">{client.contact_name}</h2>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <p className="text-xs text-gray-500 truncate">{client.contact_email}</p>
                      </div>
                      {client.contact_phone && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <p className="text-xs text-gray-500">{client.contact_phone}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                        {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClient(client) }}
                        className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 active:bg-red-100 rounded-lg transition-colors touch-manipulation"
                        title="Delete client"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Event details */}
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 mb-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400">🎉</span>
                      <span className="font-medium text-gray-800">{formatEventType(client.event_type)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span>{formatDate(client.event_date)}</span>
                      {client.event_time && <span className="text-gray-400">· {client.event_time}</span>}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        {client.guest_count} guests
                      </span>
                      {client.budget_range && (
                        <span className="text-gray-500 text-xs truncate">💰 {client.budget_range}</span>
                      )}
                    </div>
                  </div>

                  {/* Submitted date */}
                  <p className="text-xs text-gray-400 mb-3 flex items-center gap-1">
                    <ClockIcon className="h-3 w-3" />
                    Submitted {formatDate(client.created_at)}
                  </p>

                  {/* Action buttons — spacious touch targets with labels */}
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      className="flex items-center justify-center gap-2 h-11 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors col-span-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                    {client.status !== 'converted' && (
                      <button
                        onClick={() => handleActivateLead(client)}
                        disabled={activatingId === client.id}
                        className="flex items-center justify-center gap-2 h-11 px-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white text-sm font-semibold rounded-xl transition-colors col-span-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Zap className="h-4 w-4" />
                        {activatingId === client.id ? 'Activating...' : 'Activate Lead'}
                      </button>
                    )}
                    <button
                      onClick={() => { setSelectedClient(client); setShowMessageModal(true) }}
                      className="flex items-center justify-center gap-2 h-11 px-3 bg-gray-100 hover:bg-blue-50 active:bg-blue-100 text-gray-700 hover:text-blue-700 text-sm font-medium rounded-xl transition-colors"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </button>
                    <button
                      onClick={() => { setSelectedClient(client); setShowInvoiceModal(true); fetchClientInvoices(client.id) }}
                      className="flex items-center justify-center gap-2 h-11 px-3 bg-gray-100 hover:bg-green-50 active:bg-green-100 text-gray-700 hover:text-green-700 text-sm font-medium rounded-xl transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      Invoice
                    </button>
                    <button
                      onClick={() => { setSelectedClient(client); setShowAppointmentModal(true) }}
                      className="flex items-center justify-center gap-2 h-11 px-3 bg-gray-100 hover:bg-purple-50 active:bg-purple-100 text-gray-700 hover:text-purple-700 text-sm font-medium rounded-xl col-span-2 transition-colors"
                    >
                      <ClockIcon className="h-4 w-4" />
                      Schedule Appointment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Modal — slides up from bottom on mobile */}
      {showMessageModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
            {/* Handle bar for mobile */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Send Message</h2>
                <button onClick={() => setShowMessageModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">✕</button>
              </div>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="bg-blue-100 rounded-full p-2">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selectedClient.contact_name}</p>
                  <p className="text-xs text-gray-500">{selectedClient.contact_phone || 'No phone on file'}</p>
                </div>
              </div>
              {!selectedClient.contact_phone && (
                <div className="mb-3 p-3 bg-red-50 rounded-xl text-xs text-red-600 font-medium">
                  No phone number on file — SMS cannot be sent.
                </div>
              )}
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here…"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                rows={4}
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowMessageModal(false)}
                  className="flex-1 h-12 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!selectedClient.contact_phone || !messageContent.trim()}
                  className="flex-1 h-12 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Send SMS
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Send Invoice</h2>
                <button onClick={() => { setShowInvoiceModal(false); setSelectedInvoiceId(''); setClientInvoices([]) }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">✕</button>
              </div>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="bg-green-100 rounded-full p-2">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selectedClient.contact_name}</p>
                  <p className="text-xs text-gray-500">{selectedClient.contact_email}</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Invoice</label>
                {loadingInvoices ? (
                  <p className="text-sm text-gray-500 py-3 text-center">Loading invoices…</p>
                ) : clientInvoices.length === 0 ? (
                  <p className="text-sm text-gray-500 py-3 text-center">No invoices found for this client.</p>
                ) : (
                  <select
                    value={selectedInvoiceId}
                    onChange={(e) => setSelectedInvoiceId(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
                  >
                    <option value="">— Select an invoice —</option>
                    {clientInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoice_number} · ${inv.total_amount.toFixed(2)} ({inv.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-gray-500 mb-4">Invoice will be sent to the client&apos;s email address on file.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowInvoiceModal(false); setSelectedInvoiceId(''); setClientInvoices([]) }}
                  className="flex-1 h-12 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendInvoice}
                  disabled={!selectedInvoiceId}
                  className="flex-1 h-12 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Send Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      {showAppointmentModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl">
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Schedule Appointment</h2>
                <button onClick={() => setShowAppointmentModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">✕</button>
              </div>
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl">
                <div className="bg-purple-100 rounded-full p-2">
                  <User className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selectedClient.contact_name}</p>
                  <p className="text-xs text-gray-500">{formatEventType(selectedClient.event_type)} · {formatDate(selectedClient.event_date)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                    <input
                      type="date"
                      value={appointmentData.date}
                      onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                    <input
                      type="time"
                      value={appointmentData.time}
                      onChange={(e) => setAppointmentData({ ...appointmentData, time: e.target.value })}
                      className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                  <select
                    value={appointmentData.duration}
                    onChange={(e) => setAppointmentData({ ...appointmentData, duration: e.target.value })}
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm bg-white"
                  >
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
                  <textarea
                    value={appointmentData.notes}
                    onChange={(e) => setAppointmentData({ ...appointmentData, notes: e.target.value })}
                    placeholder="Add appointment notes…"
                    className="w-full px-3 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className="flex-1 h-12 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMakeAppointment}
                  disabled={!appointmentData.date || !appointmentData.time}
                  className="flex-1 h-12 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <ClockIcon className="h-4 w-4" />
                  Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
