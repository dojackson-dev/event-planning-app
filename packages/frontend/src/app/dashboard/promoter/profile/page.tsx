'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import {
  Save,
  ArrowLeft,
  User,
  Building2,
  Globe,
  Instagram,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'

interface PromoterProfile {
  id: string
  company_name: string | null
  contact_name: string
  email: string
  phone: string | null
  location: string | null
  bio: string | null
  website: string | null
  instagram: string | null
}

export default function PromoterProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<PromoterProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    location: '',
    bio: '',
    website: '',
    instagram: '',
  })

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/promoter/profile')
      const p = res.data
      setProfile(p)
      if (p) {
        setForm({
          companyName: p.company_name ?? '',
          contactName: p.contact_name ?? '',
          email: p.email ?? '',
          phone: p.phone ?? '',
          location: p.location ?? '',
          bio: p.bio ?? '',
          website: p.website ?? '',
          instagram: p.instagram ?? '',
        })
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.put('/promoter/profile', {
        companyName: form.companyName || undefined,
        contactName: form.contactName,
        email: form.email,
        phone: form.phone || undefined,
        location: form.location || undefined,
        bio: form.bio || undefined,
        website: form.website || undefined,
        instagram: form.instagram || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/promoter"
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Promoter Profile</h1>
          <p className="text-sm text-gray-500">Update your public promoter information</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700 text-sm">
          <CheckCircle className="h-4 w-4" />
          Profile saved successfully!
        </div>
      )}

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900">Contact Information</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Building2 className="h-4 w-4 inline mr-1" />
              Company / Promo Name
            </label>
            <input
              type="text"
              value={form.companyName}
              onChange={(e) => setForm(f => ({ ...f, companyName: e.target.value }))}
              placeholder="Your promo company name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <User className="h-4 w-4 inline mr-1" />
              Contact Name *
            </label>
            <input
              type="text"
              value={form.contactName}
              onChange={(e) => setForm(f => ({ ...f, contactName: e.target.value }))}
              placeholder="Your name"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Mail className="h-4 w-4 inline mr-1" />
              Email *
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="booking@yourcompany.com"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone className="h-4 w-4 inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+1 (555) 000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MapPin className="h-4 w-4 inline mr-1" />
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="City, State"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Globe className="h-4 w-4 inline mr-1" />
              Website
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
              placeholder="https://yourwebsite.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Instagram className="h-4 w-4 inline mr-1" />
              Instagram
            </label>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => setForm(f => ({ ...f, instagram: e.target.value }))}
              placeholder="@yourhandle"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            value={form.bio}
            onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}
            rows={4}
            placeholder="Tell artists and venues about your promotions..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving || !form.contactName || !form.email}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  )
}
