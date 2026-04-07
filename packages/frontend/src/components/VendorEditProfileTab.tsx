'use client'

import { useState } from 'react'
import api from '@/lib/api'
import ImageUpload from '@/components/ImageUpload'
import AddressAutocomplete from '@/components/AddressAutocomplete'
import type { VendorProfile } from '@/lib/vendorTypes'

interface Props {
  profile: VendorProfile
  onUpdate: (p: Partial<VendorProfile>) => void
}

export default function VendorEditProfileTab({ profile, onUpdate }: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [logoUrl, setLogoUrl] = useState(profile.profile_image_url || '')
  const [coverUrl, setCoverUrl] = useState(profile.cover_image_url || '')

  const [businessName, setBusinessName] = useState(profile.business_name || '')
  const [bio, setBio] = useState(profile.bio || '')
  const [address, setAddress] = useState(profile.address || '')
  const [city, setCity] = useState(profile.city || '')
  const [state, setState] = useState(profile.state || '')
  const [zipCode, setZipCode] = useState(profile.zip_code || '')
  const [hourlyRate, setHourlyRate] = useState(profile.hourly_rate?.toString() || '')
  const [flatRate, setFlatRate] = useState(profile.flat_rate?.toString() || '')
  const [rateDesc, setRateDesc] = useState(profile.rate_description || '')
  const [phone, setPhone] = useState(profile.phone || '')
  const [website, setWebsite] = useState(profile.website || '')
  const [instagram, setInstagram] = useState(profile.instagram || '')
  const [facebook, setFacebook] = useState(profile.facebook || '')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.put('/vendors/account/me', {
        businessName: businessName || undefined,
        bio, address, city, state, zipCode,
        hourlyRate: hourlyRate ? parseFloat(hourlyRate) : undefined,
        flatRate: flatRate ? parseFloat(flatRate) : undefined,
        rateDescription: rateDesc,
        phone, website, instagram, facebook: facebook || undefined,
        profileImageUrl: logoUrl || undefined,
        coverImageUrl: coverUrl || undefined,
      })
      onUpdate(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Edit Profile</h2>
      {error && <div className="bg-red-50 text-red-700 rounded p-3 text-sm mb-4">{error}</div>}
      {saved && <div className="bg-green-50 text-green-700 rounded p-3 text-sm mb-4">✓ Profile saved!</div>}
      <form onSubmit={handleSave} className="space-y-5">

        {/* Images */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile / Logo</label>
            <ImageUpload
              currentUrl={logoUrl}
              uploadType="vendor-logo"
              shape="square"
              onUpload={(url) => setLogoUrl(url)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cover Photo</label>
            <ImageUpload
              currentUrl={coverUrl}
              uploadType="vendor-cover"
              shape="landscape"
              onUpload={(url) => setCoverUrl(url)}
            />
          </div>
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business / Company Name</label>
          <input
            type="text"
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="e.g. DJ Jay Entertainment"
          />
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">About Your Business</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Tell clients what makes your business special — experience, style, what to expect…"
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
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
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1">Selecting a suggestion auto-fills city, state &amp; zip. Only shown to booked clients.</p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Dallas"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input type="text" value={state} onChange={e => setState(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="TX" maxLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
            <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="75001"
            />
          </div>
        </div>

        {/* Pricing */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Pricing</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hourly Rate ($)</label>
              <input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Flat Rate ($)</label>
              <input type="number" value={flatRate} onChange={e => setFlatRate(e.target.value)} min="0" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
          </div>
          <div className="mt-2">
            <label className="block text-xs text-gray-500 mb-1">Rate Description</label>
            <input type="text" value={rateDesc} onChange={e => setRateDesc(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. 4-hour minimum, travel included within 50 miles"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Contact</label>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="(555) 000-0000"
            />
          </div>
        </div>

        {/* Online Presence */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Online Presence</label>
          <div className="space-y-2">
            <input type="url" value={website} onChange={e => setWebsite(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="https://yourwebsite.com"
            />
            <input type="text" value={instagram} onChange={e => setInstagram(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Instagram handle (@yourhandle)"
            />
            <input type="text" value={facebook} onChange={e => setFacebook(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Facebook page URL or @handle"
            />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="bg-primary-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
