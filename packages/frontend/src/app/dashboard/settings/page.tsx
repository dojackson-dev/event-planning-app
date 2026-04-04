'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import { 
  User, 
  Settings, 
  Lock, 
  Trash2, 
  Save, 
  AlertTriangle, 
  Eye, 
  EyeOff,
  ArrowLeft,
  CheckCircle,
  ImageIcon,
  Building2,
  Banknote,
  Receipt,
} from 'lucide-react'
import { useOwnerBrand } from '@/contexts/OwnerBrandContext'
import ImageUpload from '@/components/ImageUpload'
import ConnectBankButton from '@/components/ConnectBankButton'
import AddRoleCard from '@/components/AddRoleCard'
import Link from 'next/link'

function SettingsPageContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Venue form state
  const [venueName, setVenueName] = useState('')
  const [venueAddress, setVenueAddress] = useState('')
  const [venueCity, setVenueCity] = useState('')
  const [venueState, setVenueState] = useState('')
  const [venueZipCode, setVenueZipCode] = useState('')
  const [venuePhone, setVenuePhone] = useState('')
  const [venueWebsite, setVenueWebsite] = useState('')
  const [venueCapacity, setVenueCapacity] = useState('')
  const [venueDescription, setVenueDescription] = useState('')
  const [venueLoaded, setVenueLoaded] = useState(false)

  // Payment schedule (billing) form state
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [depositPercentage, setDepositPercentage] = useState<number>(50)
  const [depositDueDaysBefore, setDepositDueDaysBefore] = useState<number>(45)
  const [finalPaymentDueDaysBefore, setFinalPaymentDueDaysBefore] = useState<number>(14)
  const [scheduleLoaded, setScheduleLoaded] = useState(false)
  
  // Password form state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  
  // UI state
  const validTabs = ['profile', 'venue', 'password', 'delete', 'branding', 'payouts', 'billing'] as const
  type TabType = typeof validTabs[number]
  const initialTab = (searchParams?.get('tab') || 'profile') as TabType
  const [activeTab, setActiveTab] = useState<TabType>(validTabs.includes(initialTab) ? initialTab : 'profile')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  
  // Load user data on mount
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setEmail(user.email || '')
      setPhone(user.phone || '')
    }
  }, [user])

  // Load venue data on mount
  useEffect(() => {
    if (venueLoaded) return
    api.get('/owner/venue').then(res => {
      const v = res.data.venue
      if (v) {
        setVenueName(v.name || '')
        setVenueAddress(v.address || '')
        setVenueCity(v.city || '')
        setVenueState(v.state || '')
        setVenueZipCode(v.zip_code || '')
        setVenuePhone(v.phone || '')
        setVenueWebsite(v.website || '')
        setVenueCapacity(v.capacity ? String(v.capacity) : '')
        setVenueDescription(v.description || '')
      }
      setVenueLoaded(true)
    }).catch(() => setVenueLoaded(true))
  }, [venueLoaded])
  
  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])
  
  // Load payment schedule on billing tab open
  useEffect(() => {
    if (activeTab !== 'billing' || scheduleLoaded) return
    api.get('/owner/payment-schedule').then(res => {
      const d = res.data
      if (d.depositPercentage !== null && d.depositPercentage !== undefined) {
        setScheduleEnabled(true)
        setDepositPercentage(Number(d.depositPercentage))
        setDepositDueDaysBefore(Number(d.depositDueDaysBefore))
        setFinalPaymentDueDaysBefore(Number(d.finalPaymentDueDaysBefore))
      }
      setScheduleLoaded(true)
    }).catch(() => setScheduleLoaded(true))
  }, [activeTab, scheduleLoaded])

  const handleSavePaymentSchedule = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await api.put('/owner/payment-schedule', {
        depositPercentage: scheduleEnabled ? depositPercentage : null,
        depositDueDaysBefore: scheduleEnabled ? depositDueDaysBefore : null,
        finalPaymentDueDaysBefore: scheduleEnabled ? finalPaymentDueDaysBefore : null,
      })
      setMessage({ type: 'success', text: 'Payment schedule saved!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save payment schedule.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    
    try {
      await api.put('/auth/profile', {
        firstName,
        lastName,
        email,
        phone
      })
      
      // Update local storage
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const updatedUser = {
          ...JSON.parse(storedUser),
          firstName,
          lastName,
          email,
          phone
        }
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to update profile' 
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveVenue = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await api.put('/owner/venue', {
        name: venueName,
        address: venueAddress,
        city: venueCity,
        state: venueState,
        zipCode: venueZipCode,
        phone: venuePhone,
        website: venueWebsite,
        capacity: venueCapacity ? parseInt(venueCapacity, 10) : undefined,
        description: venueDescription,
      })
      setMessage({ type: 'success', text: 'Venue information saved!' })
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update venue',
      })
    } finally {
      setSaving(false)
    }
  }
  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }
    
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      await api.put('/auth/password', {
        currentPassword,
        newPassword
      })
      
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to change password' 
      })
    } finally {
      setSaving(false)
    }
  }
  
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      setMessage({ type: 'error', text: 'Please type DELETE to confirm' })
      return
    }
    
    setSaving(true)
    setMessage(null)
    
    try {
      await api.delete('/auth/account')
      logout()
      router.push('/')
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to delete account' 
      })
      setSaving(false)
    }
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <Link 
          href="/dashboard" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-gray-600 mt-1">Manage your profile, password, and account preferences</p>
      </div>
      
      {/* Message Banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          )}
          {message.text}
        </div>
      )}
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <User className="h-4 w-4 inline-block mr-2" />
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('venue')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'venue'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Building2 className="h-4 w-4 inline-block mr-2" />
              Venue Details
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'password'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Lock className="h-4 w-4 inline-block mr-2" />
              Change Password
            </button>
            <button
              onClick={() => setActiveTab('branding')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'branding'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ImageIcon className="h-4 w-4 inline-block mr-2" />
              Branding
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'payouts'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Banknote className="h-4 w-4 inline-block mr-2" />
              Payouts
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'billing'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Receipt className="h-4 w-4 inline-block mr-2" />
              Billing
            </button>
            <button
              onClick={() => setActiveTab('delete')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'delete'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Trash2 className="h-4 w-4 inline-block mr-2" />
              Delete Account
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
                <p className="mt-1 text-sm text-gray-500">
                  Changing your email will require you to verify the new address
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="(555) 123-4567"
                />
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Venue Tab */}
          {activeTab === 'venue' && (
            <form onSubmit={handleSaveVenue} className="space-y-6">
              <p className="text-sm text-gray-500">
                Keep your venue information up to date so clients and vendors have accurate details.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Venue Name *</label>
                <input
                  type="text" required value={venueName} onChange={e => setVenueName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. Grand Ballroom Downtown"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                <input
                  type="text" value={venueAddress} onChange={e => setVenueAddress(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text" value={venueCity} onChange={e => setVenueCity(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Dallas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text" value={venueState} onChange={e => setVenueState(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="TX" maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Zip Code</label>
                  <input
                    type="text" value={venueZipCode} onChange={e => setVenueZipCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="75001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venue Phone</label>
                  <input
                    type="tel" value={venuePhone} onChange={e => setVenuePhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="(555) 987-6543"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Venue Website</label>
                  <input
                    type="url" value={venueWebsite} onChange={e => setVenueWebsite(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="https://myvenue.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capacity (guests)</label>
                <input
                  type="number" value={venueCapacity} onChange={e => setVenueCapacity(e.target.value)} min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g. 250"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Venue Description</label>
                <textarea
                  value={venueDescription} onChange={e => setVenueDescription(e.target.value)} rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                  placeholder="Describe your venue — amenities, atmosphere, ideal event types, parking, AV equipment…"
                />
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit" disabled={saving}
                  className="inline-flex items-center px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Venue'}
                </button>
              </div>
            </form>
          )}
          
          {/* Password Tab */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Must be at least 6 characters
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Lock className="h-4 w-4 mr-2" />
                  {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            </form>
          )}
          
          {/* Delete Account Tab */}
          {activeTab === 'delete' && (
            <div className="max-w-xl">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-red-800">
                      Danger Zone
                    </h3>
                    <p className="mt-2 text-sm text-red-700">
                      Deleting your account is <strong>permanent</strong> and <strong>cannot be undone</strong>. 
                      This action will:
                    </p>
                    <ul className="mt-3 text-sm text-red-700 list-disc list-inside space-y-1">
                      <li>Permanently delete your profile and all personal information</li>
                      <li>Remove all your events, bookings, and associated data</li>
                      <li>Cancel any active subscriptions</li>
                      <li>Delete all client data and communication history</li>
                    </ul>
                    <p className="mt-3 text-sm text-red-700 font-medium">
                      Please make sure you have exported any data you need before proceeding.
                    </p>
                  </div>
                </div>
              </div>
              
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="inline-flex items-center px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  I understand, delete my account
                </button>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <p className="text-sm text-gray-700 mb-4">
                    To confirm deletion, please type <strong>DELETE</strong> in the box below:
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 mb-4"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmText('')
                      }}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={saving || deleteConfirmText !== 'DELETE'}
                      className="inline-flex items-center px-6 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {saving ? 'Deleting...' : 'Permanently Delete Account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payouts Tab */}
          {activeTab === 'payouts' && (
            <div className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary-600" />
                  Bank Account &amp; Payouts
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Connect your bank account to receive client payments directly through
                  DoVenueSuite. All payouts are processed securely by Stripe.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-800 mb-2">💰 How payouts work</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Clients pay you directly through DoVenueSuite</li>
                  <li>• DoVenueSuite collects a <strong>5% platform fee</strong> per transaction</li>
                  <li>• Funds are deposited to your bank within 2 business days</li>
                  <li>• Pay your vendors directly from your DoVenueSuite balance</li>
                </ul>
              </div>

              {user && (
                <ConnectBankButton role="owner" email={user.email || ''} />
              )}
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === 'billing' && (
            <form onSubmit={handleSavePaymentSchedule} className="space-y-6 max-w-xl">
              <div>
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary-600" />
                  Payment Schedule Defaults
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Set your default deposit and payment due rules. These are automatically applied to every new invoice you create.
                </p>
              </div>

              {/* Toggle */}
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">Require a deposit to confirm bookings</p>
                  <p className="text-xs text-gray-500 mt-0.5">Clients pay a % upfront; the balance is due before the event</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={scheduleEnabled}
                    onChange={e => setScheduleEnabled(e.target.checked)}
                  />
                  <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:bg-primary-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>

              {scheduleEnabled && (
                <div className="space-y-5">
                  {/* Deposit % */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Required (%)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number" min="1" max="100"
                        value={depositPercentage}
                        onChange={e => setDepositPercentage(Number(e.target.value))}
                        className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                      <span className="text-sm text-gray-500">% of the invoice total is required as a deposit</span>
                    </div>
                  </div>

                  {/* Deposit due */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Due</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number" min="0"
                        value={depositDueDaysBefore}
                        onChange={e => setDepositDueDaysBefore(Number(e.target.value))}
                        className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                      <span className="text-sm text-gray-500">days before the event date</span>
                    </div>
                  </div>

                  {/* Final payment due */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final Payment Due</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number" min="0"
                        value={finalPaymentDueDaysBefore}
                        onChange={e => setFinalPaymentDueDaysBefore(Number(e.target.value))}
                        className="w-28 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                      <span className="text-sm text-gray-500">days before the event date</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 space-y-1">
                    <p className="font-semibold text-blue-900">How this will appear on invoices:</p>
                    <p>• Deposit ({depositPercentage}%) — due {depositDueDaysBefore} days before the event</p>
                    <p>• Final payment ({100 - depositPercentage}%) — due {finalPaymentDueDaysBefore} days before the event</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit" disabled={saving}
                  className="inline-flex items-center px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Billing Settings'}
                </button>
              </div>
            </form>
          )}

          {/* Branding Tab */}
          {activeTab === 'branding' && <BrandingTab />}

          {/* Multi-Role: Add Vendor Role card (shown on every tab) */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Multi-Role Access</p>
            <AddRoleCard targetRole="vendor" />
          </div>
        </div>
      </div>
    </div>
  )
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map(w => w[0].toUpperCase())
    .join('')
}

function BrandingTab() {
  const { logoUrl, businessName, updateLogo, loading } = useOwnerBrand()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleLogoUpload = async (url: string) => {
    setSaving(true)
    setError('')
    try {
      await updateLogo(url)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to save logo. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveLogo = async () => {
    setSaving(true)
    setError('')
    try {
      await updateLogo(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Failed to remove logo.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  const initials = getInitials(businessName)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary-600" />
          Venue Logo
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Your logo replaces the DoVenueSuite logo in the sidebar. Landscape logos work best.
        </p>
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
      {saved && <div className="bg-green-50 text-green-700 rounded-lg px-4 py-3 text-sm">✓ Branding updated!</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Live sidebar preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Sidebar Preview</label>
          <div className="bg-primary-600 rounded-xl flex items-center justify-center h-24 px-4">
            {logoUrl ? (
              <img src={logoUrl} alt={businessName || 'Logo'} className="max-h-14 max-w-full object-contain" />
            ) : businessName ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-xl">
                  {initials}
                </div>
                <p className="text-white/80 text-xs font-medium truncate max-w-[140px]">{businessName}</p>
              </div>
            ) : (
              <span className="text-white/50 text-xs">No logo or name</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1 text-center">Live preview</p>
        </div>

        {/* Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {logoUrl ? 'Replace Logo' : 'Upload Logo'}
          </label>
          <ImageUpload
            currentUrl={null}
            uploadType="owner-logo"
            shape="landscape"
            onUpload={handleLogoUpload}
            placeholder={
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">Click to upload</span>
              </div>
            }
          />
        </div>
      </div>

      {logoUrl && (
        <button
          onClick={handleRemoveLogo}
          disabled={saving}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Remove logo (use initials instead)
        </button>
      )}

      {!logoUrl && businessName && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Without a logo, your initials are shown in the sidebar:</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {initials}
            </div>
            <span className="font-medium text-gray-700 text-sm">{businessName}</span>
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Business Name</span>
        </div>
        <p className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
          {businessName || '—'}
        </p>
        <p className="text-xs text-gray-400 mt-1">Contact support to update your business name.</p>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsPageContent />
    </Suspense>
  )
}
