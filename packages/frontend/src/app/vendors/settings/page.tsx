'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import AddRoleCard from '@/components/AddRoleCard'
import ConnectBankButton from '@/components/ConnectBankButton'
import {
  User,
  Lock,
  Trash2,
  Save,
  AlertTriangle,
  Eye,
  EyeOff,
  ArrowLeft,
  CheckCircle,
  Bell,
  Settings,
  Building2,
} from 'lucide-react'

type Tab = 'account' | 'password' | 'notifications' | 'payouts' | 'delete'

export default function VendorSettingsPage() {
  const router = useRouter()

  // Account state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)

  // Notification prefs (stored locally for now)
  const [notifyBookingRequests, setNotifyBookingRequests] = useState(true)
  const [notifyBookingUpdates, setNotifyBookingUpdates] = useState(true)
  const [notifyPayments, setNotifyPayments] = useState(true)
  const [notifyReviews, setNotifyReviews] = useState(true)
  const [notifyMarketing, setNotifyMarketing] = useState(false)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load stored user data
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        setFirstName(u.firstName || u.first_name || '')
        setLastName(u.lastName || u.last_name || '')
        setEmail(u.email || '')
        setPhone(u.phone || '')
      }
    } catch {}
    // Load notification prefs
    try {
      const prefs = localStorage.getItem('vendorNotifPrefs')
      if (prefs) {
        const p = JSON.parse(prefs)
        setNotifyBookingRequests(p.bookingRequests ?? true)
        setNotifyBookingUpdates(p.bookingUpdates ?? true)
        setNotifyPayments(p.payments ?? true)
        setNotifyReviews(p.reviews ?? true)
        setNotifyMarketing(p.marketing ?? false)
      }
    } catch {}
  }, [])

  // Auto-dismiss message after 5s
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 5000)
      return () => clearTimeout(t)
    }
  }, [message])

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      await api.put('/auth/profile', { firstName, lastName, email, phone })
      // Update cached user
      try {
        const stored = localStorage.getItem('user')
        if (stored) {
          localStorage.setItem('user', JSON.stringify({ ...JSON.parse(stored), firstName, lastName, email, phone }))
        }
      } catch {}
      setMessage({ type: 'success', text: 'Account info updated successfully!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update account info' })
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
      await api.put('/auth/password', { currentPassword, newPassword })
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem('vendorNotifPrefs', JSON.stringify({
        bookingRequests: notifyBookingRequests,
        bookingUpdates: notifyBookingUpdates,
        payments: notifyPayments,
        reviews: notifyReviews,
        marketing: notifyMarketing,
      }))
      setMessage({ type: 'success', text: 'Notification preferences saved!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to save preferences' })
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
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user_role')
      localStorage.removeItem('user')
      router.push('/')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete account' })
      setSaving(false)
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'account',       label: 'Account Info',      icon: <User className="h-4 w-4" /> },
    { id: 'password',      label: 'Change Password',   icon: <Lock className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications',     icon: <Bell className="h-4 w-4" /> },
    { id: 'payouts',       label: 'Payouts & Bank',    icon: <Building2 className="h-4 w-4" /> },
    { id: 'delete',        label: 'Delete Account',    icon: <Trash2 className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-primary-600 font-bold text-lg">DoVenueSuite</Link>
          </div>
          <Link
            href="/vendors/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Settings className="h-5 w-5 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          </div>
          <p className="text-gray-500 text-sm">Manage your account, password, and preferences.</p>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success'
              ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              : <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Tab grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setMessage(null) }}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${
                activeTab === tab.id
                  ? tab.id === 'delete'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-primary-600 text-white shadow-sm'
                  : tab.id === 'delete'
                    ? 'bg-white text-red-500 border border-red-200 hover:bg-red-50'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
            {/* ── ACCOUNT TAB ── */}
            {activeTab === 'account' && (
              <form onSubmit={handleSaveAccount} className="space-y-6 max-w-lg">
                <p className="text-sm text-gray-500">
                  Update your personal contact information. This is separate from your public vendor profile.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                    <input
                      type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                    <input
                      type="text" value={lastName} onChange={e => setLastName(e.target.value)} required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="jane@example.com"
                  />
                  <p className="mt-1 text-xs text-gray-400">Used for login and notifications.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                  <input
                    type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button
                    type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* ── PASSWORD TAB ── */}
            {activeTab === 'password' && (
              <form onSubmit={handleChangePassword} className="space-y-6 max-w-md">
                <p className="text-sm text-gray-500">Choose a strong password that you don't use elsewhere.</p>

                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button type="button" onClick={() => setShowCurrentPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <button type="button" onClick={() => setShowNewPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">At least 6 characters.</p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPw ? 'text' : 'password'}
                      value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
                      className={`w-full px-4 py-2 pr-10 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        confirmPassword && confirmPassword !== newPassword
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-300'
                      }`}
                    />
                    <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p className="mt-1 text-xs text-red-500">Passwords don't match</p>
                  )}
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button
                    type="submit" disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
                  >
                    <Lock className="h-4 w-4" />
                    {saving ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 max-w-lg">
                <p className="text-sm text-gray-500">
                  Control which email notifications you receive from DoVenueSuite.
                </p>

                <div className="space-y-4">
                  {[
                    { label: 'New Booking Requests', desc: 'When an event owner sends you a booking request', value: notifyBookingRequests, set: setNotifyBookingRequests },
                    { label: 'Booking Status Updates', desc: 'When a booking is confirmed, cancelled, or completed', value: notifyBookingUpdates, set: setNotifyBookingUpdates },
                    { label: 'Payment Notifications', desc: 'When you receive a payment or payout', value: notifyPayments, set: setNotifyPayments },
                    { label: 'New Reviews', desc: 'When a client leaves you a review', value: notifyReviews, set: setNotifyReviews },
                    { label: 'Marketing & Tips', desc: 'Product updates, tips for growing your business', value: notifyMarketing, set: setNotifyMarketing },
                  ].map(item => (
                    <div key={item.label} className="flex items-start justify-between gap-4 py-3 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => item.set(!item.value)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                          item.value ? 'bg-primary-600' : 'bg-gray-200'
                        }`}
                        role="switch"
                        aria-checked={item.value}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                            item.value ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t">
                  <button
                    type="button" onClick={handleSaveNotifications}
                    className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white text-sm font-semibold rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* ── PAYOUTS TAB ── */}
            {activeTab === 'payouts' && (
              <div className="max-w-lg space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">Bank Account &amp; Payouts</h3>
                  <p className="text-sm text-gray-500">
                    Connect your bank account to receive payments from clients directly through DoVenueSuite. Powered by Stripe Connect.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">💰 How vendor payouts work</h4>
                  <ul className="text-sm text-blue-700 space-y-1.5">
                    <li>• Event owners pay you directly through DoVenueSuite</li>
                    <li>• DoVenueSuite collects a <strong>5% platform fee</strong> per transaction</li>
                    <li>• Stripe's standard card processing fees also apply (~2.9% + 30¢)</li>
                    <li>• Funds arrive in your bank within 2 business days after payout</li>
                    <li>• All payment handling is secure and managed by Stripe</li>
                  </ul>
                </div>

                <ConnectBankButton role="vendor" email={email} />

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    By connecting your bank account you agree to{' '}
                    <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600">Stripe's Connected Account Agreement</a>.
                    Your banking information is stored securely by Stripe and never shared with DoVenueSuite.
                  </p>
                </div>
              </div>
            )}

            {/* ── DELETE TAB ── */}
            {activeTab === 'delete' && (
              <div className="max-w-xl">
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="h-7 w-7 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-base font-semibold text-red-800">Danger Zone</h3>
                      <p className="mt-2 text-sm text-red-700">
                        Deleting your vendor account is <strong>permanent and cannot be undone</strong>. This will:
                      </p>
                      <ul className="mt-3 text-sm text-red-700 list-disc list-inside space-y-1">
                        <li>Permanently remove your public vendor profile</li>
                        <li>Delete all your bookings and earnings history</li>
                        <li>Remove your reviews and ratings</li>
                        <li>Disconnect your Stripe payout account</li>
                        <li>Delete all personal information we hold</li>
                      </ul>
                      <p className="mt-3 text-sm font-medium text-red-700">
                        Export any data you need before proceeding.
                      </p>
                    </div>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    I understand, delete my account
                  </button>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <p className="text-sm text-gray-700 mb-3">
                      To confirm, type <strong className="font-mono">DELETE</strong> below:
                    </p>
                    <input
                      type="text" value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE to confirm"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 mb-4 font-mono"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
                        className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={saving || deleteConfirmText !== 'DELETE'}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        {saving ? 'Deleting…' : 'Permanently Delete Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

          {/* Multi-Role: Add Owner Role card */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Multi-Role Access</p>
            <AddRoleCard targetRole="owner" />
          </div>
        </div>
      </div>
    </div>
  )
}
