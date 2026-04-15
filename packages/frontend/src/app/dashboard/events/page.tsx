'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Event } from '@/types'
import Pagination from '@/components/Pagination'
import { Calendar, MapPin, Users, Search, Building2, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import { useVenue } from '@/contexts/VenueContext'

const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return 'Not set'
  const [hours, minutes] = timeString.split(':').slice(0, 2)
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

/** Compute the 5-step booking progress for an event */
function computeProgress(event: any, allEstimates: any[], allInvoices: any[]) {
  const mgmt: any = event.managementData ?? {}
  const eId: string = event.id
  const ifId: string | undefined = event.intakeFormId

  const estimateAccepted = allEstimates.some(e =>
    ['approved', 'converted'].includes(e.status) &&
    (e.booking?.event_id === eId || (ifId && e.intake_form_id === ifId))
  )

  const contractSigned = mgmt.contractStatus === 'signed'

  const invoiceSent = allInvoices.some(i =>
    ['sent', 'partial', 'paid', 'overdue'].includes(i.status) &&
    (i.event_id === eId || (ifId && i.intake_form_id === ifId))
  )

  const booked =
    !!mgmt.depositPaid ||
    ['booked', 'deposit_paid', 'completed'].includes(mgmt.clientStatus ?? '')

  return [
    { label: 'Form',     done: true },
    { label: 'Estimate', done: estimateAccepted },
    { label: 'Contract', done: contractSigned },
    { label: 'Invoice',  done: invoiceSent },
    { label: 'Booked',   done: booked },
  ]
}

function EventProgressBar({ steps }: { steps: { label: string; done: boolean }[] }) {
  const currentIdx = steps.findIndex(s => !s.done)
  const pct = currentIdx === -1 ? 100 : Math.round((currentIdx / steps.length) * 100)

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      {/* Step dots + connectors */}
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1
          const isCurrent = i === currentIdx
          return (
            <div key={step.label} className="flex items-center flex-1 last:flex-none">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                ${step.done
                  ? 'bg-green-500 text-white'
                  : isCurrent
                  ? 'bg-primary-600 text-white ring-2 ring-primary-200'
                  : 'bg-gray-200 text-gray-400'
                }`}>
                {step.done
                  ? <CheckCircle2 className="h-3.5 w-3.5" />
                  : <span className="text-[10px] font-bold">{i + 1}</span>
                }
              </div>
              {!isLast && (
                <div className={`flex-1 h-0.5 mx-0.5 transition-colors ${step.done ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>
      {/* Labels */}
      <div className="flex justify-between mt-1.5">
        {steps.map((step, i) => {
          const isCurrent = i === currentIdx
          return (
            <span
              key={step.label}
              className={`text-[10px] font-medium leading-tight text-center flex-1
                ${step.done ? 'text-green-600' : isCurrent ? 'text-primary-600' : 'text-gray-400'}`}
            >
              {step.label}
            </span>
          )
        })}
      </div>
      {/* Progress fill bar */}
      <div className="mt-2 h-1 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary-500 to-green-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function EventsPage() {
  const { venues, activeVenue, setActiveVenue } = useVenue()
  const [events, setEvents] = useState<Event[]>([])
  const [allEstimates, setAllEstimates] = useState<any[]>([])
  const [allInvoices, setAllInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    fetchAll()
  }, [activeVenue])

  const fetchAll = async () => {
    setLoading(true)
    setEvents([])
    try {
      const params = activeVenue ? { venueId: activeVenue.id } : {}
      const [evRes, estRes, invRes] = await Promise.all([
        api.get<Event[]>('/events', { params }),
        api.get('/estimates').catch(() => ({ data: [] })),
        api.get('/invoices').catch(() => ({ data: [] })),
      ])
      setEvents(evRes.data)
      setAllEstimates(estRes.data || [])
      setAllInvoices(invRes.data || [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const now = new Date()
  const filteredEvents = events.filter(event => {
    const eventDate = parseLocalDate(event.date)
    if (filter === 'upcoming' && eventDate < now) return false
    if (filter === 'past' && eventDate >= now) return false
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      return (
        event.name.toLowerCase().includes(q) ||
        ((event as any).intakeEventName || '').toLowerCase().includes(q) ||
        ((event as any).clientName || '').toLowerCase().includes(q) ||
        (event.venue || '').toLowerCase().includes(q) ||
        (event.location || '').toLowerCase().includes(q)
      )
    }
    return true
  }).sort((a, b) => {
    const dateA = parseLocalDate(a.date).getTime()
    const dateB = parseLocalDate(b.date).getTime()
    const nowTime = now.getTime()
    const aUpcoming = dateA >= nowTime
    const bUpcoming = dateB >= nowTime
    if (aUpcoming && bUpcoming) return dateA - dateB
    if (!aUpcoming && !bUpcoming) return dateB - dateA
    return aUpcoming ? -1 : 1
  })

  const CARDS_PER_PAGE = 12
  const paginatedEvents = filteredEvents.slice((currentPage - 1) * CARDS_PER_PAGE, currentPage * CARDS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [searchTerm, filter])

  if (loading) {
    return <div className="flex items-center justify-center h-40 text-gray-400">Loading eventsâ€¦</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-3">Events</h1>
        <p className="text-center text-sm text-gray-500">
          Submit a <Link href="/dashboard/intake" className="text-primary-600 hover:underline font-medium">Client Intake Form</Link> to schedule a new event.
        </p>
      </div>

      {/* Venue filter tabs */}
      {venues.length > 1 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setActiveVenue(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !activeVenue ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Venues
          </button>
          {venues.map(v => (
            <button
              key={v.id}
              onClick={() => setActiveVenue(v)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeVenue?.id === v.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}

      {/* Search + Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by client name, event name, venueâ€¦"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | 'upcoming' | 'past')}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Events</option>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past Events</option>
        </select>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedEvents.map((event) => {
          const steps = computeProgress(event, allEstimates, allInvoices)
          const isComplete = steps.every(s => s.done)
          const currentIdx = steps.findIndex(s => !s.done)

          return (
            <div key={event.id} className="relative group">
              {/* Pulsing ring for incomplete events */}
              {!isComplete && (
                <div className="absolute -inset-0.5 rounded-xl bg-primary-400 opacity-30 animate-pulse pointer-events-none" />
              )}
              <Link
                href={`/dashboard/events/${event.id}/manage`}
                className={`relative bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer block overflow-hidden border ${
                  isComplete ? 'border-gray-200' : 'border-primary-200'
                }`}
              >
                {/* Status stripe */}
                <div className={`h-1.5 w-full ${
                  isComplete ? 'bg-green-400' :
                  event.status === 'completed' ? 'bg-gray-400' :
                  'bg-primary-400'
                }`} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0">
                      {(event as any).clientName && (
                        <p className="text-xs font-semibold text-primary-600 truncate mb-0.5">
                          {(event as any).clientName}
                        </p>
                      )}
                      <h3 className="text-base font-semibold text-gray-900 leading-snug">
                        {(event as any).intakeEventName || event.name}
                      </h3>
                    </div>
                    {/* Progress badge */}
                    <span className={`ml-2 flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isComplete
                        ? 'bg-green-100 text-green-700'
                        : currentIdx === 0
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-primary-50 text-primary-700'
                    }`}>
                      {isComplete ? 'âœ“ Booked' : currentIdx === 0 ? 'New' : `Step ${currentIdx + 1}/5`}
                    </span>
                  </div>

                  {/* Event details */}
                  <div className="space-y-1.5 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{format(parseLocalDate(event.date), 'PPP')}</span>
                    </div>
                    {event.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    )}
                    {event.maxGuests && (
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>Up to {event.maxGuests} guests</span>
                      </div>
                    )}
                    {(event.startTime || event.endTime) && (
                      <p className="text-xs text-gray-400 pt-0.5">
                        {formatTime(event.startTime)} â€“ {formatTime(event.endTime)}
                      </p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <EventProgressBar steps={steps} />
                </div>
              </Link>
            </div>
          )
        })}

        {filteredEvents.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No events found.</p>
            <p className="text-sm mt-1">
              <Link href="/dashboard/intake" className="text-primary-600 hover:underline">Submit a client intake form</Link> to get started.
            </p>
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalItems={filteredEvents.length}
        itemsPerPage={CARDS_PER_PAGE}
        onPageChange={setCurrentPage}
      />
    </div>
  )
}

