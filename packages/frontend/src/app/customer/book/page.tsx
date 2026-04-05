'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { EventType } from '@/types'
import { 
  Calendar, 
  Clock, 
  Users, 
  MapPin, 
  MessageSquare, 
  CheckCircle, 
  ChevronRight,
  ChevronLeft,
  Sparkles,
  PartyPopper,
  Heart,
  Music,
  Cake,
  Star,
  GraduationCap,
  Briefcase,
  Gift,
  Phone,
  Mail,
  User
} from 'lucide-react'

// Event type configuration
const eventTypes = [
  { id: EventType.WEDDING_RECEPTION, label: 'Wedding Reception', icon: Heart, color: 'pink' },
  { id: EventType.BIRTHDAY_PARTY, label: 'Birthday Party', icon: Cake, color: 'orange' },
  { id: EventType.CORPORATE_EVENT, label: 'Corporate Event', icon: Briefcase, color: 'blue' },
  { id: EventType.ANNIVERSARY, label: 'Anniversary', icon: Star, color: 'purple' },
  { id: EventType.GRADUATION_PARTY, label: 'Graduation Party', icon: GraduationCap, color: 'green' },
  { id: EventType.BABY_SHOWER, label: 'Baby Shower', icon: Gift, color: 'cyan' },
  { id: EventType.QUINCEANERA, label: 'Quinceañera', icon: Sparkles, color: 'fuchsia' },
  { id: EventType.RETIREMENT, label: 'Retirement Party', icon: PartyPopper, color: 'yellow' },
  { id: EventType.CONCERT_SHOW, label: 'Concert/Show', icon: Music, color: 'indigo' },
  { id: EventType.HOLIDAY_PARTY, label: 'Holiday Party', icon: Star, color: 'red' },
]

const timeSlots = [
  '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', 
  '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM'
]

type StepType = 'event-type' | 'date-time' | 'details' | 'contact' | 'review'

interface BookingData {
  eventType: string
  eventDate: string
  startTime: string
  endTime: string
  guestCount: number
  venueName: string
  notes: string
  contactName: string
  contactEmail: string
  contactPhone: string
}

export default function CustomerBookPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<StepType>('event-type')
  const [loading, setLoading] = useState(false)
  const [bookingData, setBookingData] = useState<BookingData>({
    eventType: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    guestCount: 50,
    venueName: 'DoVenue Event Center',
    notes: '',
    contactName: user?.firstName ? `${user.firstName} ${user.lastName}` : '',
    contactEmail: user?.email || '',
    contactPhone: user?.phone || ''
  })

  const steps: { id: StepType; label: string }[] = [
    { id: 'event-type', label: 'Event Type' },
    { id: 'date-time', label: 'Date & Time' },
    { id: 'details', label: 'Details' },
    { id: 'contact', label: 'Contact' },
    { id: 'review', label: 'Review' }
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  const canProceed = () => {
    switch (currentStep) {
      case 'event-type':
        return !!bookingData.eventType
      case 'date-time':
        return !!bookingData.eventDate && !!bookingData.startTime && !!bookingData.endTime
      case 'details':
        return bookingData.guestCount > 0
      case 'contact':
        return !!bookingData.contactName && !!bookingData.contactEmail && !!bookingData.contactPhone
      case 'review':
        return true
      default:
        return false
    }
  }

  const goNext = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id)
    }
  }

  const goPrevious = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await api.post('/intake-forms', {
        event_type: bookingData.eventType,
        event_date: bookingData.eventDate,
        start_time: bookingData.startTime,
        end_time: bookingData.endTime,
        guest_count: bookingData.guestCount,
        venue_name: bookingData.venueName,
        notes: bookingData.notes,
        contact_name: bookingData.contactName,
        contact_email: bookingData.contactEmail,
        contact_phone: bookingData.contactPhone,
        status: 'new'
      })
      
      // Redirect to success or events page
      router.push('/customer/events?success=booking')
    } catch (error) {
      console.error('Failed to submit booking:', error)
      alert('Failed to submit booking request. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatEventType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      pink: { bg: 'bg-pink-100', border: 'border-pink-500', text: 'text-pink-600' },
      orange: { bg: 'bg-orange-100', border: 'border-orange-500', text: 'text-orange-600' },
      blue: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-600' },
      purple: { bg: 'bg-purple-100', border: 'border-purple-500', text: 'text-purple-600' },
      green: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-600' },
      cyan: { bg: 'bg-cyan-100', border: 'border-cyan-500', text: 'text-cyan-600' },
      fuchsia: { bg: 'bg-fuchsia-100', border: 'border-fuchsia-500', text: 'text-fuchsia-600' },
      yellow: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-600' },
      indigo: { bg: 'bg-indigo-100', border: 'border-indigo-500', text: 'text-indigo-600' },
      red: { bg: 'bg-red-100', border: 'border-red-500', text: 'text-red-600' },
    }
    return colors[color] || colors.blue
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Book Your Event</h1>
        <p className="text-gray-500 mt-2">Let's plan something amazing together!</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm transition-colors ${
                  index < currentStepIndex
                    ? 'bg-green-500 text-white'
                    : index === currentStepIndex
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {index < currentStepIndex ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  index + 1
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`hidden sm:block w-full h-1 mx-2 rounded ${
                    index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                  style={{ width: '60px' }}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((step) => (
            <span
              key={step.id}
              className={`text-xs font-medium ${
                step.id === currentStep ? 'text-primary-600' : 'text-gray-500'
              }`}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {/* Event Type Step */}
        {currentStep === 'event-type' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">What type of event are you planning?</h2>
            <p className="text-gray-500 mb-6">Choose the event type that best matches your celebration</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {eventTypes.map((event) => {
                const Icon = event.icon
                const isSelected = bookingData.eventType === event.id
                const colors = getColorClasses(event.color, isSelected)
                
                return (
                  <button
                    key={event.id}
                    onClick={() => setBookingData({ ...bookingData, eventType: event.id })}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `${colors.border} ${colors.bg}`
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl ${isSelected ? colors.bg : 'bg-gray-100'} flex items-center justify-center mx-auto mb-3`}>
                      <Icon className={`w-6 h-6 ${isSelected ? colors.text : 'text-gray-500'}`} />
                    </div>
                    <p className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                      {event.label}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Date & Time Step */}
        {currentStep === 'date-time' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">When is your event?</h2>
            <p className="text-gray-500 mb-6">Select your preferred date and time</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Event Date
                </label>
                <input
                  type="date"
                  value={bookingData.eventDate}
                  onChange={(e) => setBookingData({ ...bookingData, eventDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Start Time
                  </label>
                  <select
                    value={bookingData.startTime}
                    onChange={(e) => setBookingData({ ...bookingData, startTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    End Time
                  </label>
                  <select
                    value={bookingData.endTime}
                    onChange={(e) => setBookingData({ ...bookingData, endTime: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select time</option>
                    {timeSlots.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Details Step */}
        {currentStep === 'details' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Tell us more about your event</h2>
            <p className="text-gray-500 mb-6">This helps us prepare the perfect setting</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users className="w-4 h-4 inline mr-2" />
                  Expected Number of Guests
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="500"
                    step="10"
                    value={bookingData.guestCount}
                    onChange={(e) => setBookingData({ ...bookingData, guestCount: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="w-20 text-center">
                    <input
                      type="number"
                      min="10"
                      max="500"
                      value={bookingData.guestCount}
                      onChange={(e) => setBookingData({ ...bookingData, guestCount: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Capacity varies by venue room. We'll confirm availability.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Special Requests or Notes (Optional)
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  placeholder="Tell us about any special requirements, themes, or requests for your event..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Contact Step */}
        {currentStep === 'contact' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact Information</h2>
            <p className="text-gray-500 mb-6">How can we reach you about your booking?</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={bookingData.contactName}
                  onChange={(e) => setBookingData({ ...bookingData, contactName: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={bookingData.contactEmail}
                  onChange={(e) => setBookingData({ ...bookingData, contactEmail: e.target.value })}
                  placeholder="john@example.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4 inline mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={bookingData.contactPhone}
                  onChange={(e) => setBookingData({ ...bookingData, contactPhone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Review Your Booking</h2>
            <p className="text-gray-500 mb-6">Please confirm all details are correct</p>
            
            <div className="space-y-4">
              <div className="bg-primary-50 rounded-xl p-4">
                <h3 className="font-semibold text-primary-900 mb-3">Event Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Event Type</p>
                    <p className="font-medium text-gray-900">{formatEventType(bookingData.eventType)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Guest Count</p>
                    <p className="font-medium text-gray-900">{bookingData.guestCount} guests</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(bookingData.eventDate)}
                      <br />
                      {bookingData.startTime} - {bookingData.endTime}
                    </p>
                  </div>
                  {bookingData.notes && (
                    <div className="col-span-2">
                      <p className="text-gray-500">Special Notes</p>
                      <p className="font-medium text-gray-900">{bookingData.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{bookingData.contactName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{bookingData.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{bookingData.contactPhone}</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This is a booking request. Our team will contact you within 24 hours to confirm availability and discuss details.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={goPrevious}
            disabled={currentStepIndex === 0}
            className="inline-flex items-center px-4 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Back
          </button>
          
          {currentStep === 'review' ? (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="inline-flex items-center px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Submit Booking Request
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={!canProceed()}
              className="inline-flex items-center px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ChevronRight className="w-5 h-5 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
