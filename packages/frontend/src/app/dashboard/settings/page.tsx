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
  Plus,
  Pencil,
  X,
  Megaphone,
  ExternalLink,
} from 'lucide-react'
import { useOwnerBrand } from '@/contexts/OwnerBrandContext'
import ImageUpload from '@/components/ImageUpload'
import ConnectBankButton from '@/components/ConnectBankButton'
import AddRoleCard from '@/components/AddRoleCard'
import Link from 'next/link'

function VenueFormFields({ form, onChange }: { form: any; onChange: (field: string, value: string) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name *</label>
        <input required type="text" value={form.name} onChange={e => onChange('name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          placeholder="e.g. Grand Ballroom Downtown" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
        <input type="text" value={form.address} onChange={e => onChange('address', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          placeholder="123 Main Street" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">City</label>
          <input type="text" value={form.city} onChange={e => onChange('city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="Dallas" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">State</label>
          <input type="text" value={form.state} onChange={e => onChange('state', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="TX" maxLength={2} />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Zip Code</label>
          <input type="text" value={form.zip_code} onChange={e => onChange('zip_code', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="75001" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">Phone</label>
          <input type="tel" value={form.phone} onChange={e => onChange('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="(555) 987-6543" />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">Website</label>
          <input type="url" value={form.website} onChange={e => onChange('website', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="https://myvenue.com" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Capacity (guests)</label>
        <input type="number" value={form.capacity} onChange={e => onChange('capacity', e.target.value)} min="1"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500" placeholder="250" />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Description</label>
        <textarea value={form.description} onChange={e => onChange('description', e.target.value)} rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 resize-none"
          placeholder="Describe your venue…" />
      </div>
    </div>
  )
}

function SettingsPageContent() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Venues state
  interface VenueData {
    id?: number
    name: string
    address: string
    city: string
    state: string
    zip_code: string
    phone: string
    website: string
    capacity: string
    description: string
  }
  const emptyVenue = (): VenueData => ({ name: '', address: '', city: '', state: '', zip_code: '', phone: '', website: '', capacity: '', description: '' })
  const [venues, setVenues] = useState<VenueData[]>([])
  const [venueLoaded, setVenueLoaded] = useState(false)
  const [editingVenueId, setEditingVenueId] = useState<number | 'new' | null>(null)
  const [venueForm, setVenueForm] = useState<VenueData>(emptyVenue())
  const [venueSaving, setVenueSaving] = useState(false)

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
  const validTabs = ['profile', 'venue', 'password', 'delete', 'branding', 'payouts', 'billing', 'promoter'] as const
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
    api.get('/owner/venues').then(res => {
      const rows = res.data.venues || []
      setVenues(rows.map((v: any) => ({
        id: v.id,
        name: v.name || '',
        address: v.address || '',
        city: v.city || '',
        state: v.state || '',
        zip_code: v.zip_code || '',
        phone: v.phone || '',
        website: v.website || '',
        capacity: v.capacity ? String(v.capacity) : '',
        description: v.description || '',
      })))
      setVenueLoaded(true)
    }).catch(() => setVenueLoaded(true))
  }, [venueLoaded])

  const handleVenueFormChange = (field: string, value: string) => {
    setVenueForm(prev => ({ ...prev, [field]: value }))
  }

  const startEditVenue = (venue: VenueData) => {
    setVenueForm({ ...venue })
    setEditingVenueId(venue.id!)
  }

  const startAddVenue = () => {
    setVenueForm(emptyVenue())
    setEditingVenueId('new')
  }

  const cancelVenueEdit = () => {
    setEditingVenueId(null)
    setVenueForm(emptyVenue())
  }

  const handleSaveVenueForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setVenueSaving(true)
    setMessage(null)
    try {
      const payload = {
        name: venueForm.name,
        address: venueForm.address,
        city: venueForm.city,
        state: venueForm.state,
        zipCode: venueForm.zip_code,
        phone: venueForm.phone,
        website: venueForm.website,
        capacity: venueForm.capacity ? parseInt(venueForm.capacity, 10) : undefined,
        description: venueForm.description,
      }
      if (editingVenueId === 'new') {
        const res = await api.post('/owner/venues', payload)
        setVenues(prev => [...prev, { ...venueForm, id: res.data.venue.id }])
      } else {
        await api.put(`/owner/venues/${editingVenueId}`, payload)
        setVenues(prev => prev.map(v => v.id === editingVenueId ? { ...venueForm, id: editingVenueId } : v))
      }
      setMessage({ type: 'success', text: editingVenueId === 'new' ? 'Venue added!' : 'Venue saved!' })
      cancelVenueEdit()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save venue' })
    } finally {
      setVenueSaving(false)
    }
  }

  const handleDeleteVenue = async (id: number) => {
    if (!window.confirm('Delete this venue? This cannot be undone.')) return
    try {
      await api.delete(`/owner/venues/${id}`)
      setVenues(prev => prev.filter(v => v.id !== id))
      setMessage({ type: 'success', text: 'Venue deleted.' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete venue' })
    }
  }
  
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
              onClick={() => setActiveTab('promoter')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'promoter'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Megaphone className="h-4 w-4 inline-block mr-2" />
              Promoter Mode
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
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Manage all venues under your account.</p>
                {editingVenueId === null && (
                  <button
                    type="button"
                    onClick={startAddVenue}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700"
                  >
                    <Plus className="h-4 w-4" /> Add Venue
                  </button>
                )}
              </div>

              {/* Venue cards */}
              {!venueLoaded ? (
                <p className="text-sm text-gray-400">Loading venues…</p>
              ) : venues.length === 0 && editingVenueId !== 'new' ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
                  <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No venues yet. Add your first venue.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {venues.map(v => (
                    <div key={v.id}>
                      {editingVenueId === v.id ? (
                        /* ── Inline edit form ── */
                        <form onSubmit={handleSaveVenueForm} className="border border-primary-300 rounded-xl p-5 space-y-4 bg-primary-50/30">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-800">Edit Venue</h3>
                            <button type="button" onClick={cancelVenueEdit} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                          </div>
                          <VenueFormFields form={venueForm} onChange={handleVenueFormChange} />
                          <div className="flex gap-3 pt-2 border-t">
                            <button type="submit" disabled={venueSaving} className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                              <Save className="h-4 w-4" />{venueSaving ? 'Saving…' : 'Save'}
                            </button>
                            <button type="button" onClick={cancelVenueEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                          </div>
                        </form>
                      ) : (
                        /* ── Venue summary card ── */
                        <div className="flex items-start justify-between border border-gray-200 rounded-xl p-4 bg-white">
                          <div>
                            <p className="font-semibold text-gray-900">{v.name}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {[v.address, v.city, v.state, v.zip_code].filter(Boolean).join(', ') || 'No address set'}
                              {v.capacity ? ` · Capacity: ${v.capacity}` : ''}
                            </p>
                            {(v.phone || v.website) && (
                              <p className="text-xs text-gray-400 mt-0.5">{[v.phone, v.website].filter(Boolean).join(' · ')}</p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4 flex-shrink-0">
                            <button type="button" onClick={() => startEditVenue(v)} className="p-1.5 text-gray-400 hover:text-primary-600 rounded">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => handleDeleteVenue(v.id!)} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add new venue form */}
              {editingVenueId === 'new' && (
                <form onSubmit={handleSaveVenueForm} className="border border-primary-300 rounded-xl p-5 space-y-4 bg-primary-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800">New Venue</h3>
                    <button type="button" onClick={cancelVenueEdit} className="text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                  </div>
                  <VenueFormFields form={venueForm} onChange={handleVenueFormChange} />
                  <div className="flex gap-3 pt-2 border-t">
                    <button type="submit" disabled={venueSaving} className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50">
                      <Plus className="h-4 w-4" />{venueSaving ? 'Saving…' : 'Add Venue'}
                    </button>
                    <button type="button" onClick={cancelVenueEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                  </div>
                </form>
              )}
            </div>
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

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                <p className="font-semibold mb-1">📄 Tax & Reporting Notice</p>
                <p>All payments in this system are processed through <strong>Stripe</strong>. Stripe may collect your EIN or SSN as required for payment processing and tax compliance. If you earn $600 or more in a calendar year, a <strong>1099 form will be issued by Stripe</strong> and made available directly in your Stripe account. DoVenueSuite does not issue 1099s.</p>
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

          {/* Promoter Mode Tab */}
          {activeTab === 'promoter' && <PromoterModeTab />}

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

function PromoterModeTab() {
  const { user } = useAuth()
  const [status, setStatus] = useState<'loading' | 'enabled' | 'not_enabled'>('loading')
  const [enabling, setEnabling] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/promoter/profile')
      .then(() => setStatus('enabled'))
      .catch(() => setStatus('not_enabled'))
  }, [])

  const handleEnable = async () => {
    setEnabling(true)
    setError('')
    try {
      await api.post('/promoter/enable')
      setStatus('enabled')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to enable promoter mode')
    } finally {
      setEnabling(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="py-12 flex justify-center">
        <div className="h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-blue-600" />
          Promoter Mode
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Enable promoter mode to create and manage public events, sell tickets, and discover artists — all from a single account.
        </p>
      </div>

      {status === 'enabled' ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Promoter Mode is Active</p>
            <p className="text-sm text-green-700 mt-0.5">
              Your promoter account is set up and ready.
            </p>
            <a
              href="/dashboard/promoter"
              className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-green-700 underline hover:text-green-900"
            >
              Go to Promoter Dashboard <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              Create and publish public events with ticketing
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              Browse and book artists from the artist directory
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              Receive ticket payouts via Stripe Connect
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              Platform fee of 3-5% per ticket sold
            </li>
          </ul>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}
          <button
            onClick={handleEnable}
            disabled={enabling}
            className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {enabling ? 'Enabling...' : 'Enable Promoter Mode'}
          </button>
        </div>
      )}
    </div>
  )
}

function BrandingTab() {
  const { logoUrl, businessName, updateLogo, updateBusinessName, loading } = useOwnerBrand()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [nameSaved, setNameSaved] = useState(false)

  // Sync input with loaded businessName
  useEffect(() => {
    setNameInput(businessName)
  }, [businessName])

  const handleSaveBusinessName = async () => {
    if (!nameInput.trim() || nameInput.trim() === businessName) return
    setSaving(true)
    setError('')
    try {
      await updateBusinessName(nameInput.trim())
      setNameSaved(true)
      setTimeout(() => setNameSaved(false), 3000)
    } catch {
      setError('Failed to update business name. Please try again.')
    } finally {
      setSaving(false)
    }
  }

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
        <div className="flex items-center gap-2 mb-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Business Name</span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveBusinessName()}
            className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Your business name"
            disabled={saving}
          />
          <button
            onClick={handleSaveBusinessName}
            disabled={saving || !nameInput.trim() || nameInput.trim() === businessName}
            className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {nameSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
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
