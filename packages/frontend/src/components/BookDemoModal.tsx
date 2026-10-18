'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import api from '@/lib/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const ROLES = [
  { value: 'venue_owner', label: 'Venue Owner', hint: 'I run a venue and book events' },
  { value: 'promoter', label: 'Promoter', hint: 'I sell tickets and run public events' },
  { value: 'artist', label: 'Artist', hint: 'I perform and take bookings' },
  { value: 'vendor', label: 'Vendor', hint: 'DJ, photographer, decor, catering and more' },
]

const EMPTY = { name: '', phone: '', role: '', description: '' }

export default function BookDemoModal({ isOpen, onClose }: Props) {
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.role) {
      setError('Choose the role that fits you best.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/contact/demo-request', form)
      setSuccess(true)
    } catch (err: any) {
      const message = err?.response?.data?.message
      setError(Array.isArray(message) ? message.join(' ') : message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setForm(EMPTY)
    setSuccess(false)
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="book-demo-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <div>
            <h2 id="book-demo-title" className="text-xl font-bold text-gray-900">Book a Demo</h2>
            <p className="text-sm text-gray-500 mt-0.5">Tell us a little about you and we&apos;ll call to set up a walkthrough.</p>
          </div>
          <button onClick={handleClose} aria-label="Close" className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-5">
          {success ? (
            <div className="text-center py-8" role="status">
              <div className="h-14 w-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Request received!</h3>
              <p className="text-gray-500 text-sm mb-6">Our team will call you at <strong>{form.phone}</strong> to schedule your demo.</p>
              <button onClick={handleClose} className="bg-accent-500 hover:bg-accent-600 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="demo-name" className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  id="demo-name"
                  type="text"
                  required
                  maxLength={100}
                  autoComplete="name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  placeholder="Jane Smith"
                />
              </div>

              <div>
                <label htmlFor="demo-phone" className="block text-sm font-medium text-gray-700 mb-1">Phone number *</label>
                <input
                  id="demo-phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  placeholder="(555) 000-0000"
                />
              </div>

              <fieldset>
                <legend className="block text-sm font-medium text-gray-700 mb-2">I am a... *</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ROLES.map(r => (
                    <label
                      key={r.value}
                      className={`flex items-start gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${form.role === r.value ? 'border-accent-500 bg-accent-50' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                      <input
                        type="radio"
                        name="demo-role"
                        value={r.value}
                        checked={form.role === r.value}
                        onChange={() => setForm(f => ({ ...f, role: r.value }))}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-semibold text-gray-900">{r.label}</span>
                        <span className="block text-xs text-gray-500">{r.hint}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div>
                <label htmlFor="demo-description" className="block text-sm font-medium text-gray-700 mb-1">Anything you&apos;d like us to know? <span className="text-gray-400">(optional)</span></label>
                <textarea
                  id="demo-description"
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent resize-none"
                  placeholder="Number of venues, what you're hoping to solve, best time to call..."
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={handleClose} className="flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 rounded-lg transition-colors text-sm">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-accent-500 hover:bg-accent-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                >
                  {loading ? 'Sending…' : 'Request Demo'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
