'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Event, Booking } from '@/types'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  addWeeks,
  subWeeks
} from 'date-fns'
import { ChevronLeft, ChevronRight, CalendarDays, CalendarRange, X, Edit2, Trash2, Clock, MapPin, Users, DollarSign, FileText, AlertCircle, Plus } from 'lucide-react'

type ViewType = 'month' | 'week'

// A unified calendar entry — either a plain Event or a Booking's event
interface CalendarEntry {
  id: string
  name: string
  date: string
  startTime?: string
  endTime?: string
  status: string
  venue?: string
  isBooking: boolean
  isIntakeForm?: boolean
  isAppointment?: boolean
  bookingId?: string
  appointmentId?: string
  clientName?: string
  clientEmail?: string
  clientPhone?: string
  durationMinutes?: number
  notes?: string
  intakeFormId?: string
  // Original data for click detail
  event?: Event
  booking?: Booking
}

// Parse date string without timezone conversion (YYYY-MM-DD -> Date at midnight local time)
const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return 'Not set'
  
  // Parse time string (HH:MM or HH:MM:SS)
  const [hours, minutes] = timeString.split(':').slice(0, 2)
  const hour = parseInt(hours, 10)
  const min = minutes
  
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  
  return `${displayHour}:${min} ${ampm}`
}

export default function CalendarPage() {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewType, setViewType] = useState<ViewType>('month')
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Create event modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createDate, setCreateDate] = useState('')
  const [createName, setCreateName] = useState('')
  const [createStart, setCreateStart] = useState('09:00')
  const [createEnd, setCreateEnd] = useState('17:00')
  const [createVenue, setCreateVenue] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createClientId, setCreateClientId] = useState('')
  const [calendarClients, setCalendarClients] = useState<{ id: string; contact_name: string; contact_phone: string }[]>([])

  // Schedule appointment modal (from calendar)
  const [showApptModal, setShowApptModal] = useState(false)
  const [apptClientName, setApptClientName] = useState('')
  const [apptClientEmail, setApptClientEmail] = useState('')
  const [apptClientPhone, setApptClientPhone] = useState('')
  const [apptDate, setApptDate] = useState('')
  const [apptTime, setApptTime] = useState('10:00')
  const [apptDuration, setApptDuration] = useState('60')
  const [apptNotes, setApptNotes] = useState('')
  const [creatingAppt, setCreatingAppt] = useState(false)
  const [createGuests, setCreateGuests] = useState('')
  const [createStatus, setCreateStatus] = useState<'draft' | 'scheduled'>('scheduled')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchAllEntries()
  }, [currentDate])

  useEffect(() => {
    api.get('/intake-forms').then(res => {
      setCalendarClients((res.data || []).map((f: any) => ({
        id: f.id,
        contact_name: f.contactName || f.contact_name || 'Unknown',
        contact_phone: f.contactPhone || f.contact_phone || '',
      })))
    }).catch(() => {})
  }, [])

  const fetchAllEntries = async () => {
    try {
      const [eventsRes, bookingsRes, intakeRes, apptRes] = await Promise.allSettled([
        api.get<Event[]>('/events'),
        api.get<Booking[]>('/bookings'),
        api.get<any[]>('/intake-forms'),
        api.get<any[]>('/appointments'),
      ])

      // Debug logs — visible in browser console
      if (eventsRes.status === 'fulfilled') {
        console.log('[Calendar] events loaded:', eventsRes.value.data.length)
      } else {
        console.error('[Calendar] events failed:', eventsRes.reason)
      }
      if (bookingsRes.status === 'rejected') {
        console.error('[Calendar] bookings failed:', bookingsRes.reason)
      }
      if (intakeRes.status === 'fulfilled') {
        console.log('[Calendar] intake forms loaded:', intakeRes.value.data.length)
      }
      if (apptRes.status === 'fulfilled') {
        console.log('[Calendar] appointments loaded:', apptRes.value.data.length)
      }

      const eventEntries: CalendarEntry[] = eventsRes.status === 'fulfilled'
        ? eventsRes.value.data.map((ev) => ({
            id: ev.id,
            name: ev.name,
            date: ev.date,
            startTime: ev.startTime,
            endTime: ev.endTime,
            status: ev.status,
            venue: ev.venue,
            isBooking: false,
            event: ev,
          }))
        : []

      const bookingEntries: CalendarEntry[] = bookingsRes.status === 'fulfilled'
        ? bookingsRes.value.data
            .filter((b) => {
              const event = b.event || (b as any).event
              const date = event?.date
              const clientStatus = b.clientStatus || (b as any).client_status
              const status = b.status || (b as any).status
              return date && clientStatus !== 'cancelled' && status !== 'cancelled'
            })
            .map((b) => {
              const event = b.event || (b as any).event
              const clientStatus = b.clientStatus || (b as any).client_status
              const clientName = b.user
                ? `${b.user.firstName || (b.user as any).first_name || ''} ${b.user.lastName || (b.user as any).last_name || ''}`.trim()
                : (b as any).contact_name || undefined
              return {
                id: `booking-${b.id}`,
                name: event?.name || 'Booking',
                date: event?.date,
                startTime: event?.startTime || event?.start_time,
                endTime: event?.endTime || event?.end_time,
                status: clientStatus,
                venue: event?.venue,
                isBooking: true,
                bookingId: b.id,
                clientName,
                booking: b,
                event: b.event,
              }
            })
        : []

      // Intake form inquiries (new/contacted only — converted ones are already bookings)
      const intakeEntries: CalendarEntry[] = intakeRes.status === 'fulfilled'
        ? intakeRes.value.data
            .filter((f: any) => f.event_date && (f.status === 'new' || f.status === 'contacted'))
            .map((f: any) => ({
              id: `intake-${f.id}`,
              name: f.event_type
                ? f.event_type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                : 'Inquiry',
              date: f.event_date,
              startTime: f.event_time,
              endTime: undefined,
              status: f.status,
              venue: undefined,
              isBooking: false,
              isIntakeForm: true,
              intakeFormId: f.id,
              clientName: f.contact_name,
            }))
        : []

      // Bookings take priority over plain events for the same event ID
      const bookedEventIds = new Set(
        bookingEntries.map((be) => (be.event as any)?.id).filter(Boolean)
      )
      const unbookedEventEntries = eventEntries.filter((e) => !bookedEventIds.has(e.id))

      // Appointments (scheduled walkthroughs/meetings with clients)
      const appointmentEntries: CalendarEntry[] = apptRes.status === 'fulfilled'
        ? apptRes.value.data
            .filter((a: any) => a.appointment_date && a.status !== 'cancelled')
            .map((a: any) => ({
              id: `appt-${a.id}`,
              name: `📌 ${a.client_name}`,
              date: a.appointment_date,
              startTime: a.appointment_time,
              endTime: undefined,
              status: a.status,
              venue: undefined,
              isBooking: false,
              isAppointment: true,
              appointmentId: a.id,
              clientName: a.client_name,
              clientEmail: a.client_email,
              clientPhone: a.client_phone,
              durationMinutes: a.duration_minutes,
              notes: a.notes,
            }))
        : []

      setEntries([...unbookedEventEntries, ...bookingEntries, ...intakeEntries, ...appointmentEntries])
    } catch (error) {
      console.error('Failed to fetch calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Month view calculations
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  // For month view, we need to show the full calendar grid starting from Sunday
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Week view calculations
  const weekStart = startOfWeek(currentDate)
  const weekEnd = endOfWeek(currentDate)
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const displayDays = viewType === 'month' ? monthDays : weekDays

  const getEventsForDay = (day: Date) => {
    return entries.filter(entry => isSameDay(parseLocalDate(entry.date), day))
  }

  const previousPeriod = () => {
    if (viewType === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else {
      setCurrentDate(subWeeks(currentDate, 1))
    }
  }

  const nextPeriod = () => {
    if (viewType === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else {
      setCurrentDate(addWeeks(currentDate, 1))
    }
  }

  const getHeaderText = () => {
    if (viewType === 'month') {
      return format(currentDate, 'MMMM yyyy')
    } else {
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
    }
  }

  const handleEventClick = (entry: CalendarEntry) => {
    setSelectedEntry(entry)
  }

  const handleDeleteEvent = async () => {
    if (!selectedEntry || selectedEntry.isBooking) return
    setIsDeleting(true)
    try {
      await api.delete(`/events/${selectedEntry.id}`)
      setEntries(entries.filter(e => e.id !== selectedEntry.id))
      setSelectedEntry(null)
      setShowDeleteConfirm(false)
      alert('Event deleted successfully')
    } catch (error) {
      console.error('Failed to delete event:', error)
      alert('Failed to delete event. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleEditEvent = () => {
    if (!selectedEntry || selectedEntry.isBooking) return
    router.push(`/dashboard/events/${selectedEntry.id}/edit`)
  }

  const openCreateModal = (day?: Date) => {
    setCreateDate(day ? format(day, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    setCreateName('')
    setCreateStart('09:00')
    setCreateEnd('17:00')
    setCreateVenue('')
    setCreateDescription('')
    setCreateGuests('')
    setCreateStatus('scheduled')
    setCreateClientId('')
    setShowCreateModal(true)
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const payload: any = {
        name: createName,
        date: createDate,
        startTime: createStart,
        endTime: createEnd,
        status: createStatus,
        clientId: createClientId || undefined,
      }
      if (createVenue) payload.venue = createVenue
      if (createDescription) payload.description = createDescription
      if (createGuests) payload.maxGuests = parseInt(createGuests)
      const res = await api.post('/events', payload)
      const newEntry: CalendarEntry = {
        id: res.data.id,
        name: res.data.name,
        date: res.data.date,
        startTime: res.data.startTime,
        endTime: res.data.endTime,
        status: res.data.status,
        venue: res.data.venue,
        isBooking: false,
        event: res.data,
      }
      setEntries(prev => [...prev, newEntry])
      setShowCreateModal(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create event')
    } finally {
      setCreating(false)
    }
  }

  const closeModal = () => {
    setSelectedEntry(null)
    setShowDeleteConfirm(false)
  }

  const openApptModal = (day?: Date) => {
    setApptDate(day ? format(day, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
    setApptClientName('')
    setApptClientEmail('')
    setApptClientPhone('')
    setApptTime('10:00')
    setApptDuration('60')
    setApptNotes('')
    setShowApptModal(true)
  }

  const handleScheduleAppointment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!apptClientName || !apptDate || !apptTime) return
    setCreatingAppt(true)
    try {
      const res = await api.post('/appointments', {
        client_name: apptClientName,
        client_email: apptClientEmail || null,
        client_phone: apptClientPhone || null,
        appointment_date: apptDate,
        appointment_time: apptTime,
        duration_minutes: parseInt(apptDuration) || 60,
        notes: apptNotes || null,
        status: 'scheduled',
      })
      const newEntry: CalendarEntry = {
        id: `appt-${res.data.id}`,
        name: `📌 ${res.data.client_name}`,
        date: res.data.appointment_date,
        startTime: res.data.appointment_time,
        status: res.data.status,
        isBooking: false,
        isAppointment: true,
        appointmentId: res.data.id,
        clientName: res.data.client_name,
        clientEmail: res.data.client_email,
        clientPhone: res.data.client_phone,
        durationMinutes: res.data.duration_minutes,
        notes: res.data.notes,
      }
      setEntries(prev => [...prev, newEntry])
      setShowApptModal(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule appointment')
    } finally {
      setCreatingAppt(false)
    }
  }

  if (loading) {
    return <div>Loading calendar...</div>
  }

  return (
    <div>
      <div className="mb-6">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Calendar</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openApptModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium"
            >
              <Clock className="h-4 w-4" />
              Schedule Appt
            </button>
            <button
              onClick={() => openCreateModal()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              New Event
            </button>
          </div>
        </div>
        
        {/* View Toggle - Centered */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              onClick={() => setViewType('month')}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewType === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Month
            </button>
            <button
              onClick={() => setViewType('week')}
              className={`inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewType === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <CalendarRange className="h-4 w-4 mr-1.5" />
              Week
            </button>
          </div>
        </div>
        
        {/* Date Navigation - Centered */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
            <button
              onClick={previousPeriod}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h2 className="text-base sm:text-lg font-semibold px-3 min-w-[220px] text-center">
              {getHeaderText()}
            </h2>
            <button
              onClick={nextPeriod}
              className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="bg-gray-50 p-3 text-center text-sm font-semibold text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {displayDays.map((day, index) => {
            const dayEvents = getEventsForDay(day)
            const isCurrentDay = isToday(day)
            const isCurrentMonth = viewType === 'week' || isSameMonth(day, currentDate)

            return (
              <div
                key={index}
                className={`bg-white p-2 ${
                  viewType === 'month' ? 'min-h-[120px]' : 'min-h-[150px]'
                } ${!isCurrentMonth ? 'bg-gray-50' : ''} group cursor-pointer`}
                onClick={() => openCreateModal(day)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-1">
                    <div
                      className={`text-sm font-semibold ${
                        isCurrentDay
                          ? 'bg-primary-600 text-white rounded-full w-7 h-7 flex items-center justify-center'
                          : 'text-gray-900'
                      }`}
                    >
                      {viewType === 'week' ? format(day, 'EEE d') : format(day, 'd')}
                    </div>
                    <Plus className="h-3.5 w-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="space-y-1 flex-1 overflow-y-auto">
                    {dayEvents.map((entry) => (
                      <div
                        key={entry.id}
                        onClick={(e) => { e.stopPropagation(); handleEventClick(entry) }}
                        className={`text-xs p-1.5 rounded cursor-pointer hover:shadow-md transition-shadow ${
                          entry.isAppointment
                            ? 'bg-teal-100 text-teal-800 border border-teal-300'
                            : entry.isIntakeForm
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : entry.isBooking
                            ? 'bg-orange-100 text-orange-800'
                            : entry.status === 'scheduled'
                            ? 'bg-green-100 text-green-800'
                            : entry.status === 'draft'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                        title={`${entry.isAppointment ? '📌 Appointment: ' : entry.isIntakeForm ? '📋 Inquiry: ' : entry.isBooking ? '📅 Booking: ' : ''}${entry.clientName || entry.name}${entry.clientName && !entry.isAppointment ? ` — ${entry.name}` : ''} | ${formatTime(entry.startTime)}${entry.durationMinutes ? ` (${entry.durationMinutes}min)` : entry.endTime ? ` to ${formatTime(entry.endTime)}` : ''}`}
                      >
                        <div className="font-medium truncate">{formatTime(entry.startTime)}{entry.durationMinutes ? ` (${entry.durationMinutes}m)` : entry.endTime ? ` - ${formatTime(entry.endTime)}` : ''}</div>
                        <div className="truncate">{entry.isIntakeForm ? '📋 ' : entry.isBooking ? '📅 ' : ''}{entry.name}</div>
                        {entry.clientName && !entry.isAppointment && <div className="truncate text-xs opacity-75">{entry.clientName}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 flex gap-6 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-amber-100 border border-amber-300 rounded"></div>
          <span>Draft</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-100 rounded"></div>
          <span>Booking</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
          <span>Inquiry (New)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-teal-100 border border-teal-300 rounded"></div>
          <span>Appointment</span>
        </div>
      </div>

      {/* Schedule Appointment Modal */}
      {showApptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">Schedule Appointment</h2>
              <button onClick={() => setShowApptModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleScheduleAppointment} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={apptClientName}
                  onChange={e => setApptClientName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="e.g. Jane Smith"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Email</label>
                <input
                  type="email"
                  value={apptClientEmail}
                  onChange={e => setApptClientEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Phone</label>
                <input
                  type="tel"
                  value={apptClientPhone}
                  onChange={e => setApptClientPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={apptDate}
                  onChange={e => setApptDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={apptTime}
                    onChange={e => setApptTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <select
                    value={apptDuration}
                    onChange={e => setApptDuration(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="30">30 min</option>
                    <option value="60">1 hour</option>
                    <option value="90">1.5 hours</option>
                    <option value="120">2 hours</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={apptNotes}
                  onChange={e => setApptNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                  placeholder="Venue walkthrough, tasting, etc."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApptModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingAppt}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 font-medium"
                >
                  {creatingAppt ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">New Event</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select
                  value={createClientId}
                  onChange={e => setCreateClientId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- Select a client --</option>
                  {calendarClients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.contact_name}{c.contact_phone ? ` · ${c.contact_phone}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Smith Wedding Reception"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={createDate}
                  onChange={e => setCreateDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={createStart}
                    onChange={e => setCreateStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={createEnd}
                    onChange={e => setCreateEnd(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                <input
                  type="text"
                  value={createVenue}
                  onChange={e => setCreateVenue(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Grand Ballroom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Guests</label>
                <input
                  type="number"
                  min="1"
                  value={createGuests}
                  onChange={e => setCreateGuests(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={createStatus}
                  onChange={e => setCreateStatus(e.target.value as 'draft' | 'scheduled')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
                >
                  {creating ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Details Modal */}
      {selectedEntry && !showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start p-6 border-b sticky top-0 bg-white">
              <div>
                {selectedEntry.isAppointment && (
                  <span className="inline-block text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full mb-1">📌 Appointment</span>
                )}
                {selectedEntry.isBooking && (
                  <span className="inline-block text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full mb-1">📅 Booking</span>
                )}
                {selectedEntry.isIntakeForm && (
                  <span className="inline-block text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full mb-1">📋 Inquiry</span>
                )}
                <h2 className="text-xl font-bold text-gray-900">{selectedEntry.isAppointment ? selectedEntry.clientName : selectedEntry.name}</h2>
                {selectedEntry.clientName && !selectedEntry.isAppointment && (
                  <p className="text-sm text-gray-500 mt-0.5">Client: {selectedEntry.clientName}</p>
                )}
              </div>
              <button onClick={closeModal} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Date */}
              <div className="flex items-start gap-3 pb-4 border-b">
                <CalendarDays className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                  <p className="text-base font-semibold text-gray-900">{format(parseLocalDate(selectedEntry.date), 'PPP')}</p>
                </div>
              </div>
              
              {/* Start & End Time */}
              <div className="flex items-start gap-3 pb-4 border-b">
                <Clock className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div className="w-full">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Time</p>
                  {selectedEntry.isAppointment ? (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Start</p>
                        <p className="text-base font-semibold text-gray-900">{formatTime(selectedEntry.startTime)}</p>
                      </div>
                      {selectedEntry.durationMinutes && (
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">Duration</p>
                          <p className="text-base font-semibold text-gray-900">{selectedEntry.durationMinutes} min</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Start</p>
                        <p className="text-base font-semibold text-gray-900">{formatTime(selectedEntry.startTime)}</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">End</p>
                        <p className="text-base font-semibold text-gray-900">{formatTime(selectedEntry.endTime)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Appointment contact info */}
              {selectedEntry.isAppointment && (selectedEntry.clientEmail || selectedEntry.clientPhone) && (
                <div className="flex items-start gap-3 pb-4 border-b">
                  <FileText className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase mb-1">Contact</p>
                    {selectedEntry.clientEmail && <p className="text-sm text-gray-900">{selectedEntry.clientEmail}</p>}
                    {selectedEntry.clientPhone && <p className="text-sm text-gray-900">{selectedEntry.clientPhone}</p>}
                  </div>
                </div>
              )}

              {/* Appointment notes */}
              {selectedEntry.isAppointment && selectedEntry.notes && (
                <div className="flex items-start gap-3 pb-4 border-b">
                  <FileText className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Notes</p>
                    <p className="text-base text-gray-900">{selectedEntry.notes}</p>
                  </div>
                </div>
              )}
              
              {/* Venue */}
              <div className="flex items-start gap-3 pb-4 border-b">
                <MapPin className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Venue</p>
                  <p className="text-base font-semibold text-gray-900">{selectedEntry.venue || 'Not specified'}</p>
                </div>
              </div>

              {/* Event details (only for plain events) */}
              {!selectedEntry.isBooking && selectedEntry.event && (
                <>
                  {(selectedEntry.event as Event).maxGuests && (
                    <div className="flex items-start gap-3 pb-4 border-b">
                      <Users className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Max Guests</p>
                        <p className="text-base font-semibold text-gray-900">{(selectedEntry.event as Event).maxGuests} guests</p>
                      </div>
                    </div>
                  )}
                  {(selectedEntry.event as Event).budget && (
                    <div className="flex items-start gap-3 pb-4 border-b">
                      <DollarSign className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Budget</p>
                        <p className="text-base font-semibold text-gray-900">${(selectedEntry.event as Event).budget!.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  {(selectedEntry.event as Event).description && (
                    <div className="flex items-start gap-3 pb-4 border-b">
                      <FileText className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Description</p>
                        <p className="text-base text-gray-900">{(selectedEntry.event as Event).description}</p>
                      </div>
                    </div>
                  )}
                  {(selectedEntry.event as Event).notes && (
                    <div className="flex items-start gap-3 pb-4 border-b">
                      <FileText className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Notes</p>
                        <p className="text-base text-gray-900">{(selectedEntry.event as Event).notes}</p>
                      </div>
                    </div>
                  )}
                  {(selectedEntry.event as Event).specialRequirements && (
                    <div className="flex items-start gap-3 pb-4 border-b">
                      <AlertCircle className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Special Requirements</p>
                        <p className="text-base text-gray-900">{(selectedEntry.event as Event).specialRequirements}</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Booking-specific info */}
              {selectedEntry.isBooking && selectedEntry.booking && (
                <div className="flex items-start gap-3 pb-4 border-b">
                  <FileText className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Booking Status</p>
                    <p className="text-base font-semibold text-gray-900 capitalize">{selectedEntry.booking.clientStatus?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              )}
              
              {/* Status */}
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Status</p>
                <span className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${
                  selectedEntry.isAppointment
                    ? 'bg-teal-100 text-teal-800'
                    : selectedEntry.isBooking
                    ? 'bg-orange-100 text-orange-800'
                    : selectedEntry.status === 'scheduled'
                    ? 'bg-green-100 text-green-800'
                    : selectedEntry.status === 'draft'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {selectedEntry.status.charAt(0).toUpperCase() + selectedEntry.status.slice(1).replace(/_/g, ' ')}
                </span>
              </div>
            </div>
            
            <div className="flex gap-3 p-6 border-t bg-gray-50 sticky bottom-0">
              {selectedEntry.isAppointment ? (
                <button
                  onClick={closeModal}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              ) : selectedEntry.isBooking ? (
                <button
                  onClick={() => { closeModal(); router.push(`/dashboard/bookings/${selectedEntry.bookingId}`) }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  View Booking
                </button>
              ) : (
                <>
                  <button
                    onClick={handleEditEvent}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {selectedEntry && showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Delete Event?</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{selectedEntry.name}</strong>? This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
