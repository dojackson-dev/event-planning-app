'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Gift,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Plus,
  Mail
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Owner {
  id: string
  email: string
  first_name: string
  last_name: string
  created_at: string
}

interface OwnerWithTrial extends Owner {
  user_id: string
  subscription_status: string
  trial_ends_at: string | null
  trial_days_remaining: number
}

export default function TrialsPage() {
  const [owners, setOwners] = useState<OwnerWithTrial[]>([])
  const [allOwners, setAllOwners] = useState<Owner[]>([])
  const [loading, setLoading] = useState(true)
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [selectedOwnerId, setSelectedOwnerId] = useState('')
  const [trialDays, setTrialDays] = useState(14)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTrials()
  }, [])

  const getToken = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchTrials = async () => {
    try {
      const token = await getToken()
      if (!token) return

      // Fetch trialing accounts
      const [trialsRes, ownersRes] = await Promise.all([
        fetch(`${API_URL}/admin/trials?page=1&limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/owners?page=1&limit=200`, { headers: { Authorization: `Bearer ${token}` } }),
      ])

      if (trialsRes.ok) {
        const data = await trialsRes.json()
        const processed = (data.trials || []).map((t: any) => ({
          id: t.id,
          user_id: t.primary_owner_id,
          email: t.owner?.email || '',
          first_name: t.owner?.first_name || '',
          last_name: t.owner?.last_name || '',
          created_at: t.created_at,
          subscription_status: t.subscription_status,
          trial_ends_at: t.trial_ends_at,
          trial_days_remaining: t.daysRemaining ?? 0,
        }))
        setOwners(processed)
      }

      if (ownersRes.ok) {
        const data = await ownersRes.json()
        setAllOwners((data.owners || []).map((o: any) => ({
          id: o.id,
          email: o.email,
          first_name: o.first_name,
          last_name: o.last_name,
          created_at: o.created_at,
        })))
      }
    } catch (error) {
      console.error('Error fetching trials:', error)
    } finally {
      setLoading(false)
    }
  }

  const grantTrial = async () => {
    if (!selectedOwnerId) return
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/admin/owners/${selectedOwnerId}/trial`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grant', days: trialDays }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await fetchTrials()
      setShowGrantModal(false)
      setSelectedOwnerId('')
      setTrialDays(14)
    } catch (error) {
      console.error('Error granting trial:', error)
      alert('Failed to grant trial')
    }
  }

  const endTrial = async (userId: string) => {
    if (!confirm('Are you sure you want to end this trial?')) return
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/admin/owners/${userId}/trial`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await fetchTrials()
    } catch (error) {
      console.error('Error ending trial:', error)
      alert('Failed to end trial')
    }
  }

  const extendTrial = async (userId: string, days: number) => {
    try {
      const token = await getToken()
      if (!token) return
      const res = await fetch(`${API_URL}/admin/owners/${userId}/trial`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', days }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      await fetchTrials()
    } catch (error) {
      console.error('Error extending trial:', error)
      alert('Failed to extend trial')
    }
  }

  const activeTrials = owners.filter(o => o.subscription_status === 'trialing' && o.trial_days_remaining > 0)
  const expiredTrials = owners.filter(o => o.subscription_status === 'trialing' && o.trial_days_remaining === 0)

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Free Trials</h1>
          <p className="text-gray-600 mt-1">Manage owner free trial periods</p>
        </div>
        <button
          onClick={() => setShowGrantModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Grant Trial
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Trials</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeTrials.length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expiring Soon (≤3 days)</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {activeTrials.filter(o => o.trial_days_remaining <= 3).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired Trials</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{expiredTrials.length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Active Trials */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-8">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Active Trials</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ends On</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeTrials.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No active trials
                  </td>
                </tr>
              ) : (
                activeTrials.map((owner) => (
                  <tr key={owner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <Gift className="h-5 w-5 text-orange-600" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {owner.first_name} {owner.last_name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{owner.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        owner.trial_days_remaining <= 3 
                          ? 'bg-red-100 text-red-800' 
                          : owner.trial_days_remaining <= 7 
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {owner.trial_days_remaining} days
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {owner.trial_ends_at 
                        ? new Date(owner.trial_ends_at).toLocaleDateString()
                        : '-'
                      }
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => extendTrial(owner.user_id, 7)}
                          className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        >
                          +7 days
                        </button>
                        <button
                          onClick={() => extendTrial(owner.user_id, 14)}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                        >
                          +14 days
                        </button>
                        <button
                          onClick={() => endTrial(owner.user_id)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                        >
                          End Trial
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Trial Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Grant Free Trial</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Owner
                </label>
                <select
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Select an owner...</option>
                  {allOwners.map(owner => (
                    <option key={owner.id} value={owner.id}>
                      {owner.first_name} {owner.last_name} ({owner.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trial Duration (days)
                </label>
                <input
                  type="number"
                  value={trialDays}
                  onChange={(e) => setTrialDays(parseInt(e.target.value))}
                  min={1}
                  max={90}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowGrantModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={grantTrial}
                disabled={!selectedOwnerId}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Grant Trial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
