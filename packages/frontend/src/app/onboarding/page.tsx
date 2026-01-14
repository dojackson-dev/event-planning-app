'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { ArrowRight, Building2, Phone, Mail, User, Plus, X } from 'lucide-react'

interface Facility {
  id: string
  name: string
  address: string
  city: string
  state: string
  zip: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [currentStep, setCurrentStep] = useState<'details' | 'payment' | 'activation'>('details')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyZip: '',
    businessType: '',
    facilities: [] as Facility[],
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddFacility = () => {
    const newFacility: Facility = {
      id: Date.now().toString(),
      name: '',
      address: '',
      city: '',
      state: '',
      zip: '',
    }
    setFormData(prev => ({
      ...prev,
      facilities: [...prev.facilities, newFacility]
    }))
  }

  const handleRemoveFacility = (id: string) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.filter(f => f.id !== id)
    }))
  }

  const handleFacilityChange = (id: string, field: keyof Facility, value: string) => {
    setFormData(prev => ({
      ...prev,
      facilities: prev.facilities.map(f =>
        f.id === id ? { ...f, [field]: value } : f
      )
    }))
  }

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.companyName || !formData.companyEmail || !formData.companyPhone) {
        throw new Error('Please fill in all required company information')
      }

      if (formData.facilities.length === 0) {
        throw new Error('Please add at least one facility')
      }

      for (const facility of formData.facilities) {
        if (!facility.name || !facility.address || !facility.city) {
          throw new Error('All facilities must have name, address, and city')
        }
      }

      await api.post('/owners/onboarding', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        companyEmail: formData.companyEmail,
        companyPhone: formData.companyPhone,
        companyAddress: formData.companyAddress,
        companyCity: formData.companyCity,
        companyState: formData.companyState,
        companyZip: formData.companyZip,
        businessType: formData.businessType,
        facilities: formData.facilities,
        userId: user?.id,
      })

      setCurrentStep('payment')
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save details')
    } finally {
      setLoading(false)
    }
  }

  const handleActivateAccount = async (useDemo: boolean) => {
    setLoading(true)
    try {
      await api.post('/owners/activate', {
        userId: user?.id,
        demoMode: useDemo,
        paymentStatus: useDemo ? 'pending' : 'completed',
      })

      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to activate account')
    } finally {
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in first</p>
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Go to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to EventSuite</h1>
          <p className="text-xl text-gray-600">Let's set up your venue account</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8 flex justify-center gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === 'details' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-700'}`}>
            <Building2 className="w-5 h-5" />
            <span className="font-medium">Details</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === 'payment' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-700'}`}>
            <span className="font-medium">Payment</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === 'activation' ? 'bg-primary-100 text-primary-700' : 'bg-gray-200 text-gray-700'}`}>
            <span className="font-medium">Activate</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        {/* Details Step */}
        {currentStep === 'details' && (
          <form onSubmit={handleDetailsSubmit} className="bg-white rounded-lg shadow-lg p-8 space-y-8">
            {/* Personal Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="w-6 h-6" />
                Personal Information
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First Name *"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name *"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* Company Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Building2 className="w-6 h-6" />
                Company Information
              </h2>
              <div className="space-y-4">
                <input
                  type="text"
                  name="companyName"
                  placeholder="Company/Venue Name *"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  name="businessType"
                  placeholder="Type of Business (Wedding Venue, Event Space, etc.)"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Mail className="w-6 h-6" />
                Contact Information
              </h2>
              <div className="space-y-4">
                <input
                  type="email"
                  name="companyEmail"
                  placeholder="Company Email *"
                  value={formData.companyEmail}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <input
                  type="tel"
                  name="companyPhone"
                  placeholder="Company Phone *"
                  value={formData.companyPhone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
                <input
                  type="text"
                  name="companyAddress"
                  placeholder="Street Address"
                  value={formData.companyAddress}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="text"
                    name="companyCity"
                    placeholder="City"
                    value={formData.companyCity}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    name="companyState"
                    placeholder="State"
                    value={formData.companyState}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    name="companyZip"
                    placeholder="ZIP"
                    value={formData.companyZip}
                    onChange={handleInputChange}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Facilities */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6" />
                  Facilities ({formData.facilities.length})
                </h2>
                <button
                  type="button"
                  onClick={handleAddFacility}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Add Facility
                </button>
              </div>

              {formData.facilities.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-600 mb-4">No facilities added yet</p>
                  <button
                    type="button"
                    onClick={handleAddFacility}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Add your first facility
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {formData.facilities.map((facility, index) => (
                    <div key={facility.id} className="border border-gray-300 rounded-lg p-6 bg-gray-50">
                      <div className="flex items-start justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Facility {index + 1}</h3>
                        <button
                          type="button"
                          onClick={() => handleRemoveFacility(facility.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        <input
                          type="text"
                          placeholder="Facility Name (e.g., Ballroom, Garden) *"
                          value={facility.name}
                          onChange={(e) => handleFacilityChange(facility.id, 'name', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Facility Address *"
                          value={facility.address}
                          onChange={(e) => handleFacilityChange(facility.id, 'address', e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          required
                        />
                        <div className="grid grid-cols-3 gap-4">
                          <input
                            type="text"
                            placeholder="City *"
                            value={facility.city}
                            onChange={(e) => handleFacilityChange(facility.id, 'city', e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            required
                          />
                          <input
                            type="text"
                            placeholder="State"
                            value={facility.state}
                            onChange={(e) => handleFacilityChange(facility.id, 'state', e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                          <input
                            type="text"
                            placeholder="ZIP"
                            value={facility.zip}
                            onChange={(e) => handleFacilityChange(facility.id, 'zip', e.target.value)}
                            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Saving...' : 'Continue to Payment'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>
        )}

        {/* Payment Step */}
        {currentStep === 'payment' && (
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Subscription Payment</h2>
              <p className="text-gray-600 mb-8">Complete your subscription to access all features</p>
            </div>

            {/* Pricing Card */}
            <div className="border-2 border-primary-500 rounded-lg p-8 bg-primary-50">
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-2">Monthly Subscription</p>
                <p className="text-5xl font-bold text-gray-900">$500<span className="text-xl text-gray-600">/month</span></p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Unlimited event management</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Client & guest list management</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>Invoice & payment tracking</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>SMS & Email notifications</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <span className="text-green-600 font-bold">✓</span>
                  <span>24/7 Support</span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-600 mb-6">
                💳 Stripe integration coming soon - Payment processing placeholder
              </p>

              <button
                onClick={() => setCurrentStep('activation')}
                disabled={loading}
                className="w-full py-3 px-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>

            {/* Demo Option */}
            <div className="border-t pt-6">
              <p className="text-center text-gray-600 mb-4">Want to explore the platform first?</p>
              <button
                onClick={() => setCurrentStep('activation')}
                className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Try Demo Mode First
              </button>
            </div>
          </div>
        )}

        {/* Activation Step */}
        {currentStep === 'activation' && (
          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Account Activation</h2>
              <p className="text-gray-600">Choose how you'd like to proceed</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Demo Mode */}
              <button
                onClick={() => handleActivateAccount(true)}
                disabled={loading}
                className="p-8 border-2 border-blue-300 rounded-lg hover:bg-blue-50 transition-colors text-left"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-4">🎮 Demo Mode</h3>
                <p className="text-gray-600 mb-6">Explore all features with sample data. Perfect for getting familiar with the platform.</p>
                <div className="space-y-2 text-sm text-gray-700 mb-6">
                  <p>✓ Full access to all features</p>
                  <p>✓ Sample events & clients</p>
                  <p>✓ No payment required</p>
                  <p>✓ 30-day trial</p>
                </div>
                <span className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium">
                  {loading ? 'Activating...' : 'Start Demo'}
                </span>
              </button>

              {/* Paid Access */}
              <button
                onClick={() => handleActivateAccount(false)}
                disabled={loading}
                className="p-8 border-2 border-green-300 rounded-lg hover:bg-green-50 transition-colors text-left"
              >
                <h3 className="text-2xl font-bold text-gray-900 mb-4">💳 Full Access</h3>
                <p className="text-gray-600 mb-6">Get immediate access with payment. Start managing your events right away.</p>
                <div className="space-y-2 text-sm text-gray-700 mb-6">
                  <p>✓ Unlimited events</p>
                  <p>✓ Priority support</p>
                  <p>✓ Advanced features</p>
                  <p>✓ $500/month</p>
                </div>
                <span className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-medium">
                  {loading ? 'Processing...' : 'Activate Account'}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
