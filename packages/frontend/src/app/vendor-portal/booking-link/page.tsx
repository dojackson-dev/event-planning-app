'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'
import { Link2, Copy, CheckCircle2, Loader2, Globe, MessageSquare, Percent, Save } from 'lucide-react'

interface BookingLink {
  id: string
  slug: string
  is_active: boolean
  custom_message: string | null
  default_deposit_percentage: number | null
}

export default function VendorBookingLinkPage() {
  const [link, setLink] = useState<BookingLink | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [slug, setSlug] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [customMessage, setCustomMessage] = useState('')
  const [depositPct, setDepositPct] = useState<number | ''>('')

  useEffect(() => {
    fetchLink()
  }, [])

  const fetchLink = async () => {
    try {
      const res = await api.get('/vendors/booking-links/mine')
      if (res.data) {
        setLink(res.data)
        setSlug(res.data.slug)
        setIsActive(res.data.is_active)
        setCustomMessage(res.data.custom_message ?? '')
        setDepositPct(res.data.default_deposit_percentage ?? '')
      }
    } catch {
      // no link yet
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!slug.trim()) {
      setError('A slug is required.')
      return
    }
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
      setError('Slug must be 3-60 characters: lowercase letters, numbers, hyphens only.')
      return
    }

    setSaving(true)
    try {
      const res = await api.post('/vendors/booking-links', {
        slug,
        isActive,
        customMessage: customMessage || undefined,
        defaultDepositPercentage: depositPct !== '' ? Number(depositPct) : undefined,
      })
      setLink(res.data)
      setSuccess('Booking link saved!')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save booking link.')
    } finally {
      setSaving(false)
    }
  }

  const bookingUrl = link ? `${window.location.origin}/book/${link.slug}` : ''

  const copyLink = () => {
    navigator.clipboard.writeText(bookingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const suggestSlug = () => {
    const base = `vendor-${Math.random().toString(36).substring(2, 8)}`
    setSlug(base)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/vendor-portal" className="text-sm text-gray-400 hover:text-gray-600 mb-2 inline-block">
          ← Vendor Portal
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-6">
          <Link2 className="w-6 h-6 text-primary-600" />
          Booking Link
        </h1>

        {/* Live booking link badge */}
        {link && link.is_active && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
              <Globe className="w-4 h-4" />
              <a href={bookingUrl} target="_blank" rel="noreferrer" className="hover:underline truncate">
                {bookingUrl}
              </a>
            </div>
            <button
              onClick={copyLink}
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
            >
              {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-5 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-4 mb-5 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {success}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {/* Slug */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Booking Link URL *
              </label>
              <p className="text-xs text-gray-400 mb-3">
                This becomes <span className="font-mono">{window.location.origin}/book/<em>your-slug</em></span>.
                Only lowercase letters, numbers, and hyphens.
              </p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500">
                  <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 whitespace-nowrap">
                    /book/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-business-name"
                    className="flex-1 px-3 py-2 text-sm focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={suggestSlug}
                  className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 whitespace-nowrap"
                >
                  Suggest
                </button>
              </div>
            </div>

            {/* Message */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-gray-400" /> Welcome Message
              </label>
              <p className="text-xs text-gray-400 mb-2">Displayed at the top of your public booking page.</p>
              <textarea
                rows={3}
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                placeholder="Hi! I'm available for events. Fill out the form and I'll be in touch within 24 hours."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>

            {/* Deposit */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
                <Percent className="w-4 h-4 text-gray-400" /> Default Deposit Percentage
              </label>
              <p className="text-xs text-gray-400 mb-2">Optional. Shown on booking requests as a reference.</p>
              <div className="flex items-center gap-2 max-w-[180px]">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={depositPct}
                  onChange={e => setDepositPct(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="e.g. 25"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-400">%</span>
              </div>
            </div>

            {/* Active toggle */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Booking Link Active</p>
                  <p className="text-xs text-gray-400">When inactive, visitors see a "not available" message.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(v => !v)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${isActive ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Booking Link'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
