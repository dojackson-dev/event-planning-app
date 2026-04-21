'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import PhoneInput from '@/components/PhoneInput'
import AddressAutocomplete from '@/components/AddressAutocomplete'

const CATEGORIES = [
  { value: 'dj', label: 'DJ', icon: '🎧', desc: 'Disc jockeys for events & parties' },
  { value: 'decorator', label: 'Decorator', icon: '🎨', desc: 'Event decoration & styling' },
  { value: 'planner_coordinator', label: 'Planner / Coordinator', icon: '📋', desc: 'Full-service event planning' },
  { value: 'furniture', label: 'Furniture', icon: '🪑', desc: 'Rentals, tables, chairs, and more' },
  { value: 'photographer', label: 'Photographer', icon: '📷', desc: 'Photo & video services' },
  { value: 'musicians', label: 'Musicians', icon: '🎵', desc: 'Live music bands & performers' },
  { value: 'mc_host', label: 'MC / Host', icon: '🎤', desc: 'Master of ceremonies & hosting' },
  { value: 'other', label: 'Other', icon: '⭐', desc: 'Other event services' },
]

type Step = 'account' | 'category' | 'profile'

export default function VendorRegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Account step
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [smsOptIn, setSmsOptIn] = useState(false)

  // Category step
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  // Profile step
  const [businessName, setBusinessName] = useState('')
  const [bio, setBio] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [hourlyRate, setHourlyRate] = useState('')
  const [flatRate, setFlatRate] = useState('')
  const [rateDesc, setRateDesc] = useState('')
  const [website, setWebsite] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')

  // Saved session after signup
  const [session, setSession] = useState<any>(null)

  // If already logged in, skip account creation step
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      const stored = localStorage.getItem('user')
      if (stored) {
        try {
          const u = JSON.parse(stored)
          if (u.email) setEmail(u.email)
          if (u.firstName) setFirstName(u.firstName)
          if (u.lastName) setLastName(u.lastName)
        } catch {}
      }
      setStep('category')
    }
  }, [])

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/flow/vendor/signup', {
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phone,
        smsOptIn,
      })
      setSession(res.data.session)
      // Save token for subsequent requests
      if (res.data.session?.access_token) {
        localStorage.setItem('access_token', res.data.session.access_token)
      }
      setStep('category')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const handleCategorySelect = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }

  const handleCategoryContinue = () => {
    if (selectedCategories.length === 0) return
    setStep('profile')
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/vendors/account', {
        businessName,
        categories: selectedCategories,
        category: selectedCategories[0] || undefined,
        bio,
        address,
        city,
        state,
        zipCode,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        flatRate: flatRate ? parseFloat(flatRate) : undefined,
        rateDescription: rateDesc,
        website,
        instagram,
        facebook: facebook || undefined,
        phone,
        email,
      })
      router.push('/vendors/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Profile creation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary-600">DoVenueSuite</Link>
          <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">Already have an account? Log in</Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Progress */}
        <div className="flex items-center mb-10 gap-2">
          {(['account', 'category', 'profile'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'bg-primary-600 text-white' :
                (['account', 'category', 'profile'].indexOf(step) > i) ? 'bg-green-500 text-white' :
                'bg-gray-200 text-gray-500'
              }`}>
                {(['account', 'category', 'profile'].indexOf(step) > i) ? '✓' : i + 1}
              </div>
              <span className={`ml-2 text-sm font-medium ${step === s ? 'text-primary-600' : 'text-gray-400'}`}>
                {s === 'account' ? 'Account' : s === 'category' ? 'Category' : 'Profile'}
              </span>
              {i < 2 && <div className="flex-1 h-0.5 bg-gray-200 mx-3" />}
            </div>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">{error}</div>
        )}

        {/* STEP 1: Account */}
        {step === 'account' && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your vendor account</h1>
            <p className="text-gray-500 text-sm mb-6">Free to list. Get discovered by event owners.</p>
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text" required value={firstName} onChange={e => setFirstName(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text" required value={lastName} onChange={e => setLastName(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  suppressHydrationWarning
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  smsOptIn={smsOptIn}
                  onSmsOptInChange={setSmsOptIn}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                  suppressHydrationWarning
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit" disabled={loading}
                suppressHydrationWarning
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50 mt-2"
              >
                {loading ? 'Creating account...' : 'Create Account →'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: Category */}
        {step === 'category' && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">What do you offer?</h1>
            <p className="text-gray-500 text-sm mb-6">Select all services that apply to your business.</p>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(cat => {
                const checked = selectedCategories.includes(cat.value)
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => handleCategorySelect(cat.value)}
                    className={`flex flex-col items-start p-4 border-2 rounded-xl transition-all text-left ${
                      checked
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50'
                    }`}
                  >
                    <span className="text-3xl mb-2">{cat.icon}</span>
                    <span className={`font-semibold ${checked ? 'text-primary-600' : 'text-gray-900'}`}>{cat.label}</span>
                    <span className="text-xs text-gray-500 mt-0.5">{cat.desc}</span>
                    {checked && <span className="text-xs text-primary-600 font-medium mt-1">✓ Selected</span>}
                  </button>
                )
              })}
            </div>
            <button
              onClick={handleCategoryContinue}
              disabled={selectedCategories.length === 0}
              className="mt-6 w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue ({selectedCategories.length} selected) →
            </button>
          </div>
        )}

        {/* STEP 3: Profile */}
        {step === 'profile' && (
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete your profile</h1>
            <p className="text-gray-500 text-sm mb-6">Help clients find and connect with you.</p>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text" required value={businessName} onChange={e => setBusinessName(e.target.value)}
                  suppressHydrationWarning
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g. Elite DJ Services"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About Your Business</label>
                <textarea
                  value={bio} onChange={e => setBio(e.target.value)} rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Tell clients what makes your business special..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <AddressAutocomplete
                  value={address}
                  onChange={setAddress}
                  onSelect={({ address: a, city: c, state: s, zip: z }) => {
                    setAddress(a)
                    setCity(c)
                    setState(s)
                    setZipCode(z)
                  }}
                  placeholder="Start typing your street address…"
                />
                <p className="text-xs text-gray-400 mt-1">Selecting a suggestion will auto-fill city, state &amp; zip</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text" value={city} onChange={e => setCity(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text" value={state} onChange={e => setState(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="TX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                  <input
                    type="text" value={zipCode} onChange={e => setZipCode(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="75001"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Pricing</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Hourly Rate ($)</label>
                    <input
                      type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} min="0" step="0.01"
                      suppressHydrationWarning
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Flat Rate ($)</label>
                    <input
                      type="number" value={flatRate} onChange={e => setFlatRate(e.target.value)} min="0" step="0.01"
                      suppressHydrationWarning
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="block text-xs text-gray-500 mb-1">Rate Description</label>
                  <input
                    type="text" value={rateDesc} onChange={e => setRateDesc(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g. 4-hour minimum, travel included"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Online Presence</label>
                <div className="space-y-2">
                  <input
                    type="url" value={website} onChange={e => setWebsite(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://yourwebsite.com"
                  />
                  <input
                    type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Instagram handle (@yourhandle)"
                  />
                  <input
                    type="text" value={facebook} onChange={e => setFacebook(e.target.value)}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Facebook page URL or @handle"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                suppressHydrationWarning
                className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Creating profile...' : '🎉 Complete Registration'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
