'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'
import { ArrowLeft, Calendar, Mail, Phone, Users, Clock, MapPin, Utensils, Wrench, Heart, Accessibility, DollarSign, Info, CheckCircle, MessageSquare, FileText, Clock as ClockIcon, Pencil, Store, X, ChevronRight, ArrowRight } from 'lucide-react'

const VENDOR_CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'dj', label: '🎧 DJ' },
  { value: 'decorator', label: '🎨 Decorator' },
  { value: 'planner_coordinator', label: '📋 Planner/Coordinator' },
  { value: 'furniture', label: '🪑 Furniture' },
  { value: 'photographer', label: '📷 Photographer' },
  { value: 'musicians', label: '🎵 Musicians' },
  { value: 'mc_host', label: '🎤 MC/Host' },
  { value: 'other', label: '⭐ Other' },
]

interface VendorForSearch {
  id: string
  business_name: string
  category: string
  city?: string
  state?: string
  hourly_rate?: number
  flat_rate?: number
  avgRating?: number
  profile_image_url?: string
}

interface EventVendorBooking {
  id: string
  vendor_account_id: string
  event_name: string
  event_date: string
  agreed_amount: number
  deposit_amount: number
  status: string
  vendor_accounts?: { business_name: string; category: string; profile_image_url?: string }
}

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
  const [showEditModal, setShowEditModal] = useState(false)
  const [editData, setEditData] = useState<Partial<IntakeForm>>({})
  const [saving, setSaving] = useState(false)
  const [messageContent, setMessageContent] = useState('')
  const [appointmentData, setAppointmentData] = useState({ date: '', time: '', notes: '' })
  const [workflowStep, setWorkflowStep] = useState<number>(1)
  const [converting, setConverting] = useState(false)

  // ── Vendor booking state ──────────────────────────────────────
  const [eventVendors, setEventVendors] = useState<EventVendorBooking[]>([])
  const [showVendorModal, setShowVendorModal] = useState(false)
  const [vendorList, setVendorList] = useState<VendorForSearch[]>([])
  const [vendorListLoading, setVendorListLoading] = useState(false)
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState('')
  const [selectedVendorToBook, setSelectedVendorToBook] = useState<VendorForSearch | null>(null)
  const [vbAgreedAmount, setVbAgreedAmount] = useState('')
  const [vbDepositAmount, setVbDepositAmount] = useState('')
  const [vbNotes, setVbNotes] = useState('')
  const [vbSubmitting, setVbSubmitting] = useState(false)

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
      setEditData(response.data)
      fetchEventVendors(response.data.event_date)
      // Restore saved workflow step for this client
      const saved = localStorage.getItem(`workflow_step_${params.id}`)
      if (saved) {
        setWorkflowStep(parseInt(saved))
      } else if (response.data.status === 'converted') {
        setWorkflowStep(5)
        localStorage.setItem(`workflow_step_${params.id}`, '5')
      }
    } catch (error) {
      console.error('Error fetching client:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchEventVendors = async (eventDate: string) => {
    if (!eventDate) return
    try {
      const res = await api.get('/vendors/bookings/owner')
      const all: EventVendorBooking[] = res.data || []
      const dateStr = eventDate.split('T')[0]
      setEventVendors(all.filter(b => b.event_date?.split('T')[0] === dateStr))
    } catch {
      // owner may not have vendor bookings yet
    }
  }

  const handleOpenVendorModal = async (cat = '') => {
    setShowVendorModal(true)
    setSelectedVendorToBook(null)
    setVbAgreedAmount('')
    setVbDepositAmount('')
    setVbNotes('')
    setVendorCategoryFilter(cat)
    setVendorListLoading(true)
    try {
      const res = await api.get(`/vendors/public${cat ? `?category=${cat}` : ''}`)
      setVendorList(res.data?.vendors || res.data || [])
    } catch {
      setVendorList([])
    } finally {
      setVendorListLoading(false)
    }
  }

  const handleVendorCategoryFilter = async (cat: string) => {
    setVendorCategoryFilter(cat)
    setVendorListLoading(true)
    try {
      const res = await api.get(`/vendors/public${cat ? `?category=${cat}` : ''}`)
      setVendorList(res.data?.vendors || res.data || [])
    } catch {
      setVendorList([])
    } finally {
      setVendorListLoading(false)
    }
  }

  const handleBookVendorSubmit = async () => {
    if (!selectedVendorToBook || !client) return
    setVbSubmitting(true)
    try {
      await api.post('/vendors/bookings', {
        vendorAccountId: selectedVendorToBook.id,
        eventName: formatEventType(client.event_type),
        eventDate: client.event_date.split('T')[0],
        venueName: client.venue_preference || undefined,
        notes: vbNotes || undefined,
        agreedAmount: vbAgreedAmount ? parseFloat(vbAgreedAmount) : undefined,
        depositAmount: vbDepositAmount ? parseFloat(vbDepositAmount) : undefined,
      })
      setShowVendorModal(false)
      setSelectedVendorToBook(null)
      fetchEventVendors(client.event_date)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to book vendor')
    } finally {
      setVbSubmitting(false)
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

  const handleSaveEdit = async () => {
    if (!client) return
    setSaving(true)
    try {
      await api.put(`/intake-forms/${client.id}`, editData)
      await fetchClient()
      setShowEditModal(false)
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleSendMessage = async () => {
    if (!client || !messageContent.trim()) return
    if (!client.contact_phone) {
      alert('This client has no phone number on file. SMS cannot be sent.')
      return
    }
    try {
      await api.post('/messages/send', {
        recipientPhone: client.contact_phone,
        recipientName: client.contact_name,
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
    return new Date(dateString + 'T12:00:00').toLocaleDateString('en-US', {
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

        {/* Booking Workflow Progress */}
        {(() => {
          const STEPS = [
            { step: 1, label: 'Send Estimate',     icon: FileText,    active: 'bg-blue-600',    ring: 'ring-blue-300',    bar: 'bg-blue-600'    },
            { step: 2, label: 'Estimate Approved', icon: CheckCircle, active: 'bg-green-600',   ring: 'ring-green-300',   bar: 'bg-green-600'   },
            { step: 3, label: 'Send Invoice',      icon: FileText,    active: 'bg-indigo-600',  ring: 'ring-indigo-300',  bar: 'bg-indigo-600'  },
            { step: 4, label: 'Deposit Confirmed', icon: DollarSign,  active: 'bg-emerald-600', ring: 'ring-emerald-300', bar: 'bg-emerald-600' },
            { step: 5, label: 'Booked',            icon: CheckCircle, active: 'bg-green-600',   ring: 'ring-green-300',   bar: 'bg-green-600'   },
          ] as const
          const current = workflowStep
          const handleStep = async (n: number) => {
            if (n === 5) return // step 5 is auto-only
            if (n === 4 && current < 4) {
              // Clicking Deposit Confirmed → auto-convert to booking
              setWorkflowStep(4)
              localStorage.setItem(`workflow_step_${params.id}`, '4')
              setConverting(true)
              try {
                await api.post(`/intake-forms/${params.id}/convert-to-booking`, {})
                setWorkflowStep(5)
                localStorage.setItem(`workflow_step_${params.id}`, '5')
                await fetchClient()
              } catch (err: any) {
                alert(err.response?.data?.message || 'Could not confirm booking. Please try again.')
                setWorkflowStep(3)
                localStorage.setItem(`workflow_step_${params.id}`, '3')
              } finally {
                setConverting(false)
              }
              return
            }
            const next = n === current ? n - 1 : n
            const val = Math.max(0, next)
            setWorkflowStep(val)
            localStorage.setItem(`workflow_step_${params.id}`, String(val))
          }
          const pct = current <= 1 ? 0 : Math.round(((current - 1) / (STEPS.length - 1)) * 100)
          const activeStep = STEPS[current - 1]
          return (
            <div className="bg-white rounded-lg shadow p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking Progress</h2>
                {current >= 5 ? (
                  <span className="text-xs font-bold px-3 py-1 rounded-full text-white bg-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Booked
                  </span>
                ) : current > 0 && (
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${activeStep?.active ?? 'bg-gray-400'}`}>
                    {converting ? 'Confirming booking…' : `Step ${current} of ${STEPS.length} — ${activeStep?.label}`}
                  </span>
                )}
              </div>
              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${activeStep?.bar ?? 'bg-gray-300'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* Step dots */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {STEPS.map((s, idx) => {
                  const done = s.step < current
                  const isCurrent = s.step === current
                  const Icon = s.icon
                  return (
                    <div key={s.step} className="flex items-center gap-1 flex-shrink-0">
                      {s.step === 5 ? (
                        // Step 5 is auto-set — render as a read-only badge
                        <div
                          className={`flex flex-col items-center px-2.5 py-2.5 rounded-xl border-2 w-[7.5rem] text-center
                            ${current >= 5
                              ? 'bg-green-600 border-transparent text-white shadow-md ring-2 ring-green-300'
                              : 'border-gray-200 bg-gray-50 text-gray-300'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mb-1.5
                            ${current >= 5 ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-400'}`}>
                            {current >= 5 ? '✓' : 5}
                          </div>
                          <Icon className="h-4 w-4 mb-1" />
                          <span className="text-[10px] font-bold leading-tight">
                            {current >= 5 ? '✓ Booked' : 'Booked'}
                          </span>
                          {current < 5 && (
                            <span className="text-[9px] leading-tight opacity-60 mt-0.5">auto</span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStep(s.step)}
                          disabled={converting}
                          title={s.label}
                          className={`flex flex-col items-center px-2.5 py-2.5 rounded-xl border-2 w-[7.5rem] text-center transition-all disabled:opacity-60
                            ${
                              isCurrent
                                ? `border-current ${s.active} text-white shadow-md ring-2 ${s.ring}`
                                : done
                                ? `${s.active} border-transparent text-white opacity-80`
                                : 'border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mb-1.5
                            ${isCurrent || done ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-500'}`}>
                            {done ? '✓' : s.step}
                          </div>
                          <Icon className="h-4 w-4 mb-1" />
                          <span className="text-[10px] font-medium leading-tight">{s.label}</span>
                          {s.step === 4 && current < 4 && (
                            <span className="text-[9px] leading-tight opacity-70 mt-0.5">→ auto-books</span>
                          )}
                        </button>
                      )}
                      {idx < STEPS.length - 1 && (
                        <ArrowRight className={`h-3.5 w-3.5 flex-shrink-0 ${s.step < current ? 'text-gray-400' : 'text-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-2">Mark steps 1–3 as you progress. Clicking <strong>Deposit Confirmed</strong> automatically books the client and notifies any conflicting leads.</p>
            </div>
          )
        })()}

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

            {/* Vendors for this Event */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-purple-600" /> Vendors for this Event
                </h2>
                <button
                  onClick={() => handleOpenVendorModal()}
                  className="flex items-center gap-1.5 bg-purple-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-purple-700"
                >
                  <Store className="h-3.5 w-3.5" /> Book Vendor
                </button>
              </div>

              {eventVendors.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No vendors booked for this event date yet.</p>
              ) : (
                <div className="space-y-2">
                  {eventVendors.map(vb => {
                    const vendor = vb.vendor_accounts
                    return (
                      <div key={vb.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{vendor?.business_name || 'Vendor'}</p>
                          <p className="text-xs text-gray-500 capitalize">{vendor?.category?.replace('_', ' ')}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {vb.agreed_amount > 0 && (
                            <span className="text-sm font-semibold text-gray-900">${Number(vb.agreed_amount).toLocaleString()}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                            vb.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            vb.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            vb.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{vb.status}</span>
                          {(vb.status === 'confirmed' || vb.status === 'completed') && (
                            <a
                              href={`/dashboard/invoices/new?vendorBookingId=${vb.id}`}
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
                            >
                              + Invoice <ChevronRight className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
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
                  onClick={() => { setEditData(client!); setShowEditModal(true) }}
                  className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Client Details
                </button>

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
                  Send SMS
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
              <h2 className="text-xl font-bold mb-4">Send SMS to {client.contact_name}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone (SMS)</label>
                  <input
                    type="tel"
                    value={client.contact_phone || 'No phone on file'}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                  {!client.contact_phone && (
                    <p className="text-xs text-red-500 mt-1">No phone number — SMS cannot be sent.</p>
                  )}
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
                    disabled={!client.contact_phone}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send SMS
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

        {/* Edit Client Modal */}
        {showEditModal && client && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-6">Edit Client Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" value={editData.contact_name || ''} onChange={e => setEditData({ ...editData, contact_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={editData.contact_email || ''} onChange={e => setEditData({ ...editData, contact_email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={editData.contact_phone || ''} onChange={e => setEditData({ ...editData, contact_phone: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <input type="text" value={editData.event_type || ''} onChange={e => setEditData({ ...editData, event_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                  <input type="date" value={editData.event_date ? editData.event_date.slice(0, 10) : ''} onChange={e => setEditData({ ...editData, event_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Time</label>
                  <input type="time" value={editData.event_time || ''} onChange={e => setEditData({ ...editData, event_time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guest Count</label>
                  <input type="number" value={editData.guest_count ?? ''} onChange={e => setEditData({ ...editData, guest_count: Number(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
                  <input type="text" value={editData.budget_range || ''} onChange={e => setEditData({ ...editData, budget_range: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Services Needed</label>
                  <textarea value={editData.services_needed || ''} onChange={e => setEditData({ ...editData, services_needed: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venue Preference</label>
                  <input type="text" value={editData.venue_preference || ''} onChange={e => setEditData({ ...editData, venue_preference: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catering Requirements</label>
                  <textarea value={editData.catering_requirements || ''} onChange={e => setEditData({ ...editData, catering_requirements: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment Needs</label>
                  <textarea value={editData.equipment_needs || ''} onChange={e => setEditData({ ...editData, equipment_needs: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Restrictions</label>
                  <input type="text" value={editData.dietary_restrictions || ''} onChange={e => setEditData({ ...editData, dietary_restrictions: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accessibility Requirements</label>
                  <input type="text" value={editData.accessibility_requirements || ''} onChange={e => setEditData({ ...editData, accessibility_requirements: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                  <textarea value={editData.special_requests || ''} onChange={e => setEditData({ ...editData, special_requests: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">How Did They Hear About Us</label>
                  <input type="text" value={editData.how_did_you_hear || ''} onChange={e => setEditData({ ...editData, how_did_you_hear: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>

              </div>
              <div className="flex gap-3 justify-end pt-6">
                <button onClick={() => setShowEditModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
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

      {/* ─── Vendor Booking Modal ─────────────────────────────── */}
      {showVendorModal && client && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Book a Vendor</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatEventType(client.event_type)} &bull; {new Date(client.event_date + 'T00:00:00').toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setShowVendorModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!selectedVendorToBook ? (
              /* Step 1: Choose a vendor */
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Category filter */}
                <div className="px-6 pt-4 flex gap-2 flex-wrap">
                  {VENDOR_CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      onClick={() => handleVendorCategoryFilter(c.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        vendorCategoryFilter === c.value
                          ? 'bg-purple-600 text-white border-purple-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-purple-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {vendorListLoading ? (
                    <div className="py-8 text-center text-gray-400">
                      <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-purple-600 mx-auto mb-2" />
                      Loading vendors…
                    </div>
                  ) : vendorList.length === 0 ? (
                    <p className="text-center text-gray-400 py-8">No vendors found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {vendorList.map(v => (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVendorToBook(v)}
                          className="text-left p-4 border border-gray-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all group"
                        >
                          <p className="font-semibold text-gray-900 group-hover:text-purple-700 text-sm">{v.business_name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 capitalize">{v.category?.replace('_', ' ')}</p>
                          {(v.city || v.state) && (
                            <p className="text-xs text-gray-400 mt-1">{[v.city, v.state].filter(Boolean).join(', ')}</p>
                          )}
                          {(v.hourly_rate || v.flat_rate) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {v.hourly_rate ? `$${v.hourly_rate}/hr` : `$${v.flat_rate} flat`}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Step 2: Confirm booking details */
              <div className="px-6 py-5 flex flex-col gap-4">
                {/* Selected vendor summary */}
                <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900">{selectedVendorToBook.business_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{selectedVendorToBook.category?.replace('_', ' ')}</p>
                  </div>
                  <button
                    onClick={() => setSelectedVendorToBook(null)}
                    className="text-xs text-purple-600 hover:underline"
                  >
                    Change
                  </button>
                </div>

                {/* Event summary (read-only) */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Event</label>
                    <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                      {formatEventType(client.event_type)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                    <p className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
                      {new Date(client.event_date + 'T00:00:00').toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Agreed amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agreed Amount <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={vbAgreedAmount}
                        onChange={e => setVbAgreedAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deposit <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={vbDepositAmount}
                        onChange={e => setVbDepositAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={vbNotes}
                    onChange={e => setVbNotes(e.target.value)}
                    rows={2}
                    placeholder="Any special requirements or notes for this vendor…"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-2">
                  <button
                    onClick={() => setShowVendorModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookVendorSubmit}
                    disabled={vbSubmitting}
                    className="px-5 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {vbSubmitting ? 'Booking…' : 'Send Booking Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
