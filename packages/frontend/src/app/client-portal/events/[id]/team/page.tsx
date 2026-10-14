'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import clientApi from '@/lib/clientApi'
import { Users, ArrowLeft, Plus, Trash2, Loader2, Phone } from 'lucide-react'

interface TeamMember {
  id: string
  phone: string
  name: string | null
  created_at: string
}

function ManageTeamPageContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventId = params.id as string
  const eventName = searchParams.get('name') || 'this event'

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const fetchMembers = () => {
    clientApi.get(`/events/${eventId}/team`)
      .then(res => setMembers(res.data))
      .catch(() => setError('Failed to load team members.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchMembers() }, [eventId])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!phone.trim()) { setError('A phone number is required.'); return }

    setAdding(true)
    try {
      await clientApi.post(`/events/${eventId}/team`, { phone: phone.trim(), name: name.trim() || undefined })
      setName('')
      setPhone('')
      fetchMembers()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add team member.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this person from the team? They will no longer be able to access this event.')) return
    setRemovingId(memberId)
    try {
      await clientApi.delete(`/events/${eventId}/team/${memberId}`)
      setMembers(prev => prev.filter(m => m.id !== memberId))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to remove team member.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <button
        onClick={() => router.push('/client-portal/events')}
        className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" /> Back to My Events
      </button>

      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-primary-600" />
          Manage Team
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Add other people who can help manage <span className="font-medium">{eventName}</span>. They&apos;ll log in the same way you do, using their own phone number.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
      )}

      <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-700">Add a Team Member</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Maid of Honor"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number *</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-60 transition-colors"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {adding ? 'Adding...' : 'Add Team Member'}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-700">Current Team</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : members.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No team members added yet.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map(m => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{m.name || 'Unnamed'}</p>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone className="h-3 w-3" /> {m.phone}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removingId === m.id}
                  className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1.5"
                  aria-label="Remove team member"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ManageTeamPage() {
  return (
    <Suspense>
      <ManageTeamPageContent />
    </Suspense>
  )
}
