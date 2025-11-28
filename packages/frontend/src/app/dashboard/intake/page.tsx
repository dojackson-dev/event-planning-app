'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { EventType } from '@/types'
import { Calendar, Users, Clock, DollarSign, FileText, ArrowLeft, ArrowRight } from 'lucide-react'

const eventTypeLabels: Record<EventType, string> = {
  [EventType.WEDDING_RECEPTION]: 'Wedding Reception',
  [EventType.BIRTHDAY_PARTY]: 'Birthday Party',
  [EventType.RETIREMENT]: 'Retirement',
  [EventType.ANNIVERSARY]: 'Anniversary',
  [EventType.BABY_SHOWER]: 'Baby Shower',
  [EventType.CORPORATE_EVENT]: 'Corporate Event',
  [EventType.FUNDRAISER_GALA]: 'Fundraiser/Gala',
  [EventType.CONCERT_SHOW]: 'Concert/Show',
  [EventType.CONFERENCE_MEETING]: 'Conference/Meeting',
  [EventType.WORKSHOP]: 'Workshop',
  [EventType.QUINCEANERA]: 'Quinceañera',
  [EventType.SWEET_16]: 'Sweet 16',
  [EventType.PROM_FORMAL]: 'Prom/Formal',
  [EventType.FAMILY_REUNION]: 'Family Reunion',
  [EventType.MEMORIAL_SERVICE]: 'Memorial Service',
  [EventType.PRODUCT_LAUNCH]: 'Product Launch',
  [EventType.HOLIDAY_PARTY]: 'Holiday Party',
  [EventType.ENGAGEMENT_PARTY]: 'Engagement Party',
  [EventType.GRADUATION_PARTY]: 'Graduation Party',
}

export default function ClientIntakePage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Map frontend event types to database enum values
  const mapEventTypeToDb = (eventType: EventType): string => {
    const mapping: Record<string, string> = {
      [EventType.WEDDING_RECEPTION]: 'wedding',
      [EventType.ANNIVERSARY]: 'anniversary',
      [EventType.BIRTHDAY_PARTY]: 'birthday',
      [EventType.SWEET_16]: 'birthday',
      [EventType.RETIREMENT]: 'party',
      [EventType.BABY_SHOWER]: 'party',
      [EventType.QUINCEANERA]: 'party',
      [EventType.PROM_FORMAL]: 'party',
      [EventType.FAMILY_REUNION]: 'party',
      [EventType.HOLIDAY_PARTY]: 'party',
      [EventType.ENGAGEMENT_PARTY]: 'party',
      [EventType.GRADUATION_PARTY]: 'party',
      [EventType.CORPORATE_EVENT]: 'corporate',
      [EventType.FUNDRAISER_GALA]: 'corporate',
      [EventType.PRODUCT_LAUNCH]: 'corporate',
      [EventType.CONFERENCE_MEETING]: 'conference',
      [EventType.WORKSHOP]: 'workshop',
      [EventType.CONCERT_SHOW]: 'party',
      [EventType.MEMORIAL_SERVICE]: 'party',
    }
    return mapping[eventType] || 'other'
  }

  const [formData, setFormData] = useState({
    // Client Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    preferredContact: 'phone' as 'phone' | 'email' | 'text',
    
    // Event Details
    eventType: EventType.BIRTHDAY_PARTY,
    eventName: '',
    eventDate: '',
    alternateDate: '',
    isFlexibleDate: false,
    startTime: '',
    endTime: '',
    setupTime: '',
    
    // Guest Information
    estimatedGuests: '',
    confirmedGuests: '',
    guestAgeRange: [] as string[],
    vipGuests: '',
    
    // Venue & Setup
    preferredVenue: '',
    indoorOutdoor: 'indoor' as 'indoor' | 'outdoor' | 'both',
    setupStyle: 'banquet' as 'banquet' | 'theater' | 'cocktail' | 'classroom' | 'custom',
    needsDanceFloor: false,
    needsStage: false,
    
    // Services
    needsCatering: false,
    cateringStyle: '',
    dietaryRestrictions: '',
    needsDecorator: false,
    colorTheme: '',
    decorStyle: '',
    needsBalloons: false,
    needsMarquee: false,
    musicType: '' as '' | 'dj' | 'band' | 'mc' | 'none',
    needsPhotographer: false,
    needsVideographer: false,
    
    // Bar & Beverages
    barOption: 'none' as 'none' | 'open' | 'cash' | 'limited',
    beerWineOnly: false,
    
    // Additional Services
    needsSecurity: false,
    securityCount: '',
    needsParking: false,
    parkingSpaces: '',
    needsValet: false,
    
    // Budget & Payment
    estimatedBudget: '',
    budgetFlexibility: 'firm' as 'firm' | 'flexible' | 'very-flexible',
    paymentPreference: 'card' as 'card' | 'check' | 'cash' | 'wire',
    
    // Special Requirements
    specialRequests: '',
    allergies: '',
    accessibility: '',
    
    // How They Found Us
    referralSource: 'google' as 'google' | 'social' | 'referral' | 'repeat' | 'other',
    referralDetails: '',
    
    // Follow-up
    walkthroughRequested: false,
    preferredWalkthroughDate: '',
    preferredWalkthroughTime: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleCheckboxGroup = (name: string, value: string) => {
    setFormData(prev => {
      const currentValues = prev[name as keyof typeof prev] as string[]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      return { ...prev, [name]: newValues }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Transform frontend data to match database schema
      const dbData = {
        event_type: mapEventTypeToDb(formData.eventType),
        event_date: formData.eventDate,
        event_time: formData.startTime || null,
        guest_count: parseInt(formData.estimatedGuests) || null,
        venue_preference: formData.preferredVenue || null,
        contact_name: `${formData.firstName} ${formData.lastName}`.trim() || 'Unknown',
        contact_email: formData.email || 'unknown@example.com',
        contact_phone: formData.phone || null,
        services_needed: [
          formData.needsCatering && 'Catering',
          formData.needsDecorator && 'Decoration',
          formData.musicType && `Music: ${formData.musicType}`,
          formData.needsPhotographer && 'Photography',
          formData.needsVideographer && 'Videography',
          formData.needsSecurity && 'Security',
          formData.needsValet && 'Valet Parking'
        ].filter(Boolean).join(', ') || null,
        catering_requirements: formData.needsCatering ? `${formData.cateringStyle || ''} | Bar: ${formData.barOption}`.trim() : null,
        equipment_needs: [
          formData.needsDanceFloor && 'Dance Floor',
          formData.needsStage && 'Stage',
          formData.needsBalloons && 'Balloons',
          formData.needsMarquee && 'Marquee'
        ].filter(Boolean).join(', ') || null,
        special_requests: formData.specialRequests || null,
        dietary_restrictions: formData.dietaryRestrictions || null,
        accessibility_requirements: formData.accessibility || null,
        budget_range: formData.estimatedBudget || null,
        how_did_you_hear: formData.referralSource || null
      }

      console.log('Submitting intake form data:', dbData)

      // Submit intake form
      await api.post('/intake-forms', dbData)
      
      // Show success message
      alert('Client intake form submitted successfully!')
      router.push('/dashboard/bookings')
    } catch (err: any) {
      console.error('Intake form submission error:', err.response?.data || err.message)
      setError(err.response?.data?.message || err.message || 'Failed to submit intake form')
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Client Intake Form</h1>
        <p className="text-sm sm:text-base text-gray-600">Gather comprehensive information for event consultation</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-6">
        <div className="flex justify-between items-center">
          {[1, 2, 3, 4, 5].map((step) => (
            <div key={step} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full font-semibold text-sm sm:text-base ${
                step === currentStep 
                  ? 'bg-primary-600 text-white' 
                  : step < currentStep 
                  ? 'bg-green-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step < currentStep ? '✓' : step}
              </div>
              {step < 5 && (
                <div className={`h-1 flex-1 mx-1 sm:mx-2 ${
                  step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-3">
          <span className={`text-xs sm:text-sm ${currentStep === 1 ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>Client</span>
          <span className={`text-xs sm:text-sm ${currentStep === 2 ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>Event</span>
          <span className={`text-xs sm:text-sm ${currentStep === 3 ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>Services</span>
          <span className={`text-xs sm:text-sm ${currentStep === 4 ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>Budget</span>
          <span className={`text-xs sm:text-sm ${currentStep === 5 ? 'text-primary-600 font-semibold' : 'text-gray-500'}`}>Review</span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Client Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6">
            <div className="flex items-center mb-4">
              <Users className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Client Information</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="(555) 123-4567"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Contact Method
              </label>
              <div className="flex flex-wrap gap-3">
                {['phone', 'email', 'text'].map((method) => (
                  <label key={method} className="flex items-center">
                    <input
                      type="radio"
                      name="preferredContact"
                      value={method}
                      checked={formData.preferredContact === method}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{method}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How did you hear about us?
              </label>
              <select
                name="referralSource"
                value={formData.referralSource}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="google">Google Search</option>
                <option value="social">Social Media</option>
                <option value="referral">Friend/Family Referral</option>
                <option value="repeat">Repeat Customer</option>
                <option value="other">Other</option>
              </select>
            </div>

            {formData.referralSource === 'referral' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Who referred you?
                </label>
                <input
                  type="text"
                  name="referralDetails"
                  value={formData.referralDetails}
                  onChange={handleChange}
                  placeholder="Name of person who referred you"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 2: Event Details */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6">
            <div className="flex items-center mb-4">
              <Calendar className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Event Details</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type *
                </label>
                <select
                  name="eventType"
                  required
                  value={formData.eventType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Name/Title
                </label>
                <input
                  type="text"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  placeholder="e.g., Sarah's 30th Birthday Celebration"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Event Date *
                </label>
                <input
                  type="date"
                  name="eventDate"
                  required
                  value={formData.eventDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Date (if flexible)
                </label>
                <input
                  type="date"
                  name="alternateDate"
                  value={formData.alternateDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time *
                </label>
                <input
                  type="time"
                  name="startTime"
                  required
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time *
                </label>
                <input
                  type="time"
                  name="endTime"
                  required
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Guest Count *
                </label>
                <input
                  type="number"
                  name="estimatedGuests"
                  required
                  min="1"
                  value={formData.estimatedGuests}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmed Guests
                </label>
                <input
                  type="number"
                  name="confirmedGuests"
                  min="0"
                  value={formData.confirmedGuests}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest Age Range (select all that apply)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['Children', 'Teens', 'Adults', 'Seniors'].map((age) => (
                  <label key={age} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.guestAgeRange.includes(age)}
                      onChange={() => handleCheckboxGroup('guestAgeRange', age)}
                      className="mr-2"
                    />
                    <span className="text-sm">{age}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VIP Guests / Special Honorees
              </label>
              <textarea
                name="vipGuests"
                rows={2}
                value={formData.vipGuests}
                onChange={handleChange}
                placeholder="List any VIP guests or people being honored"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Preference
              </label>
              <div className="flex flex-wrap gap-3">
                {['indoor', 'outdoor', 'both'].map((venue) => (
                  <label key={venue} className="flex items-center">
                    <input
                      type="radio"
                      name="indoorOutdoor"
                      value={venue}
                      checked={formData.indoorOutdoor === venue}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm capitalize">{venue}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Setup Style
              </label>
              <select
                name="setupStyle"
                value={formData.setupStyle}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="banquet">Banquet (Seated Dinner)</option>
                <option value="theater">Theater (Rows of Chairs)</option>
                <option value="cocktail">Cocktail (Standing/Mingling)</option>
                <option value="classroom">Classroom (Tables with Chairs)</option>
                <option value="custom">Custom Setup</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="needsDanceFloor"
                  checked={formData.needsDanceFloor}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm">Need Dance Floor</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="needsStage"
                  checked={formData.needsStage}
                  onChange={handleChange}
                  className="mr-2"
                />
                <span className="text-sm">Need Stage/Platform</span>
              </label>
            </div>
          </div>
        )}

        {/* Step 3: Services & Amenities */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6">
            <div className="flex items-center mb-4">
              <FileText className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Services & Amenities</h2>
            </div>

            {/* Catering */}
            <div className="border-b pb-6">
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  name="needsCatering"
                  checked={formData.needsCatering}
                  onChange={handleChange}
                  className="mr-3 h-5 w-5"
                />
                <span className="text-base font-semibold">Catering Services</span>
              </label>

              {formData.needsCatering && (
                <div className="ml-8 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Catering Style
                    </label>
                    <select
                      name="cateringStyle"
                      value={formData.cateringStyle}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select style...</option>
                      <option value="plated">Plated Dinner</option>
                      <option value="buffet">Buffet</option>
                      <option value="stations">Food Stations</option>
                      <option value="cocktail">Cocktail/Hors d'oeuvres</option>
                      <option value="family">Family Style</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dietary Restrictions / Special Requests
                    </label>
                    <textarea
                      name="dietaryRestrictions"
                      rows={2}
                      value={formData.dietaryRestrictions}
                      onChange={handleChange}
                      placeholder="Vegetarian, vegan, gluten-free, allergies, etc."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Decorations */}
            <div className="border-b pb-6">
              <label className="flex items-center mb-3">
                <input
                  type="checkbox"
                  name="needsDecorator"
                  checked={formData.needsDecorator}
                  onChange={handleChange}
                  className="mr-3 h-5 w-5"
                />
                <span className="text-base font-semibold">Decoration Services</span>
              </label>

              {formData.needsDecorator && (
                <div className="ml-8 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Color Theme
                    </label>
                    <input
                      type="text"
                      name="colorTheme"
                      value={formData.colorTheme}
                      onChange={handleChange}
                      placeholder="e.g., Navy blue and gold"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Decoration Style/Theme
                    </label>
                    <input
                      type="text"
                      name="decorStyle"
                      value={formData.decorStyle}
                      onChange={handleChange}
                      placeholder="e.g., Rustic, elegant, modern, vintage"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="needsBalloons"
                        checked={formData.needsBalloons}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <span className="text-sm">Balloon Decorations</span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="needsMarquee"
                        checked={formData.needsMarquee}
                        onChange={handleChange}
                        className="mr-2"
                      />
                      <span className="text-sm">Marquee Letters/Signs</span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Entertainment */}
            <div className="border-b pb-6">
              <h3 className="text-base font-semibold mb-3">Entertainment</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Music/Entertainment Type
                </label>
                <select
                  name="musicType"
                  value={formData.musicType}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select option...</option>
                  <option value="dj">DJ</option>
                  <option value="band">Live Band</option>
                  <option value="mc">MC/Host</option>
                  <option value="none">No Music/Entertainment</option>
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="needsPhotographer"
                    checked={formData.needsPhotographer}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm">Photographer</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="needsVideographer"
                    checked={formData.needsVideographer}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm">Videographer</span>
                </label>
              </div>
            </div>

            {/* Bar Service */}
            <div className="border-b pb-6">
              <h3 className="text-base font-semibold mb-3">Bar Service</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bar Option
                </label>
                <select
                  name="barOption"
                  value={formData.barOption}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="none">No Bar</option>
                  <option value="open">Open Bar (Hosted)</option>
                  <option value="cash">Cash Bar</option>
                  <option value="limited">Limited Bar (Beer & Wine)</option>
                </select>
              </div>

              {formData.barOption !== 'none' && (
                <label className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    name="beerWineOnly"
                    checked={formData.beerWineOnly}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  <span className="text-sm">Beer & Wine Only (No Liquor)</span>
                </label>
              )}
            </div>

            {/* Additional Services */}
            <div>
              <h3 className="text-base font-semibold mb-3">Additional Services</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      name="needsSecurity"
                      checked={formData.needsSecurity}
                      onChange={handleChange}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium">Security Personnel</span>
                  </label>
                  {formData.needsSecurity && (
                    <input
                      type="number"
                      name="securityCount"
                      min="1"
                      value={formData.securityCount}
                      onChange={handleChange}
                      placeholder="Number of security staff needed"
                      className="ml-7 w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <label className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      name="needsParking"
                      checked={formData.needsParking}
                      onChange={handleChange}
                      className="mr-3"
                    />
                    <span className="text-sm font-medium">Parking Assistance</span>
                  </label>
                  {formData.needsParking && (
                    <input
                      type="number"
                      name="parkingSpaces"
                      min="1"
                      value={formData.parkingSpaces}
                      onChange={handleChange}
                      placeholder="Estimated parking spaces needed"
                      className="ml-7 w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  )}
                </div>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="needsValet"
                    checked={formData.needsValet}
                    onChange={handleChange}
                    className="mr-3"
                  />
                  <span className="text-sm font-medium">Valet Service</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Budget & Payment */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6">
            <div className="flex items-center mb-4">
              <DollarSign className="h-6 w-6 text-primary-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Budget & Payment</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Budget *
              </label>
              <select
                name="estimatedBudget"
                required
                value={formData.estimatedBudget}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select budget range...</option>
                <option value="under-5k">Under $5,000</option>
                <option value="5k-10k">$5,000 - $10,000</option>
                <option value="10k-20k">$10,000 - $20,000</option>
                <option value="20k-50k">$20,000 - $50,000</option>
                <option value="over-50k">Over $50,000</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Flexibility
              </label>
              <div className="flex flex-wrap gap-4">
                {[
                  { value: 'firm', label: 'Firm Budget' },
                  { value: 'flexible', label: 'Somewhat Flexible' },
                  { value: 'very-flexible', label: 'Very Flexible' }
                ].map(({value, label}) => (
                  <label key={value} className="flex items-center">
                    <input
                      type="radio"
                      name="budgetFlexibility"
                      value={value}
                      checked={formData.budgetFlexibility === value}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'card', label: 'Credit/Debit Card' },
                  { value: 'check', label: 'Check' },
                  { value: 'cash', label: 'Cash' },
                  { value: 'wire', label: 'Wire Transfer' }
                ].map(({value, label}) => (
                  <label key={value} className="flex items-center">
                    <input
                      type="radio"
                      name="paymentPreference"
                      value={value}
                      checked={formData.paymentPreference === value}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-base font-semibold mb-3">Special Requirements</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Requests
                  </label>
                  <textarea
                    name="specialRequests"
                    rows={3}
                    value={formData.specialRequests}
                    onChange={handleChange}
                    placeholder="Any special requests, custom needs, or unique requirements..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Allergy Concerns
                  </label>
                  <textarea
                    name="allergies"
                    rows={2}
                    value={formData.allergies}
                    onChange={handleChange}
                    placeholder="Food allergies, latex, floral sensitivities, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accessibility Needs
                  </label>
                  <textarea
                    name="accessibility"
                    rows={2}
                    value={formData.accessibility}
                    onChange={handleChange}
                    placeholder="Wheelchair access, hearing assistance, etc."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-6 bg-blue-50 rounded-lg p-4">
              <h3 className="text-base font-semibold mb-3 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Schedule a Walkthrough
              </h3>
              
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="walkthroughRequested"
                  checked={formData.walkthroughRequested}
                  onChange={handleChange}
                  className="mr-3 h-5 w-5"
                />
                <span className="text-sm font-medium">I'd like to schedule a venue walkthrough</span>
              </label>

              {formData.walkthroughRequested && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Date
                    </label>
                    <input
                      type="date"
                      name="preferredWalkthroughDate"
                      value={formData.preferredWalkthroughDate}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Time
                    </label>
                    <input
                      type="time"
                      name="preferredWalkthroughTime"
                      value={formData.preferredWalkthroughTime}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Review & Submit */}
        {currentStep === 5 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Review Your Information</h2>
            
            <div className="space-y-6">
              {/* Client Info Summary */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Client Information</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Name:</strong> {formData.firstName} {formData.lastName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                  <p><strong>Preferred Contact:</strong> {formData.preferredContact}</p>
                </div>
              </div>

              {/* Event Info Summary */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Event Details</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Type:</strong> {eventTypeLabels[formData.eventType]}</p>
                  {formData.eventName && <p><strong>Name:</strong> {formData.eventName}</p>}
                  <p><strong>Date:</strong> {formData.eventDate}</p>
                  <p><strong>Time:</strong> {formData.startTime} - {formData.endTime}</p>
                  <p><strong>Guests:</strong> {formData.estimatedGuests} (estimated)</p>
                  <p><strong>Venue:</strong> {formData.indoorOutdoor}</p>
                  <p><strong>Setup:</strong> {formData.setupStyle}</p>
                </div>
              </div>

              {/* Services Summary */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Services Requested</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {formData.needsCatering && <p>✓ Catering ({formData.cateringStyle})</p>}
                  {formData.needsDecorator && <p>✓ Decorations</p>}
                  {formData.musicType && <p>✓ Entertainment: {formData.musicType.toUpperCase()}</p>}
                  {formData.barOption !== 'none' && <p>✓ Bar Service: {formData.barOption}</p>}
                  {formData.needsSecurity && <p>✓ Security ({formData.securityCount} staff)</p>}
                  {formData.needsPhotographer && <p>✓ Photographer</p>}
                  {formData.needsVideographer && <p>✓ Videographer</p>}
                  {formData.needsValet && <p>✓ Valet Service</p>}
                </div>
              </div>

              {/* Budget Summary */}
              <div className="border-b pb-4">
                <h3 className="font-semibold text-gray-900 mb-2">Budget</h3>
                <div className="text-sm text-gray-600">
                  <p><strong>Estimated Budget:</strong> {formData.estimatedBudget.replace(/-/g, ' - ').toUpperCase()}</p>
                  <p><strong>Flexibility:</strong> {formData.budgetFlexibility.replace(/-/g, ' ')}</p>
                </div>
              </div>

              {/* Walkthrough */}
              {formData.walkthroughRequested && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Walkthrough Requested</h3>
                  <div className="text-sm text-gray-600">
                    <p><strong>Preferred Date:</strong> {formData.preferredWalkthroughDate}</p>
                    <p><strong>Preferred Time:</strong> {formData.preferredWalkthroughTime}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-green-800">
                By submitting this form, you consent to being contacted by our team regarding your event. 
                We typically respond within 24 hours.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="flex items-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Previous
            </button>
          )}
          
          {currentStep < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="flex items-center ml-auto px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Next
              <ArrowRight className="h-5 w-5 ml-2" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="ml-auto px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Submitting...' : 'Submit Intake Form'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
