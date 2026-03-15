'use client'

/**
 * AddRoleCard
 * A self-contained card shown in the settings pages that lets a user
 * add a new role (vendor → owner, or owner → vendor) to their account.
 *
 * Props:
 *   targetRole: 'owner' | 'vendor'  — the role we want to add
 */

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import api from '@/lib/api'
import { Building2, Store, PlusCircle, CheckCircle2, ArrowRight } from 'lucide-react'

interface AddRoleCardProps {
  targetRole: 'owner' | 'vendor'
}

const META = {
  owner: {
    icon: <Building2 className="w-6 h-6 text-indigo-600" />,
    title: 'Become a Venue Owner',
    description:
      'Manage your own venues, events, clients, and bookings. Once added, you can switch between your Vendor and Owner dashboards without logging out.',
    cta: 'Add Venue Owner Role',
    color: 'border-indigo-200 bg-indigo-50',
    btnColor: 'bg-indigo-600 hover:bg-indigo-700',
    registerHref: '/register',
  },
  vendor: {
    icon: <Store className="w-6 h-6 text-emerald-600" />,
    title: 'Also offer Vendor services?',
    description:
      'Add a Vendor role to list your services (DJ, photography, catering, etc.) in the vendor directory and receive booking requests from venues.',
    cta: 'Add Vendor Role',
    color: 'border-emerald-200 bg-emerald-50',
    btnColor: 'bg-emerald-600 hover:bg-emerald-700',
    registerHref: '/vendors/register',
  },
}

export default function AddRoleCard({ targetRole }: AddRoleCardProps) {
  const { roles, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  const meta = META[targetRole]

  // Don't show if user already has this role
  if (roles.includes(targetRole as UserRole)) return null

  const handleAddRole = async () => {
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('access_token') || ''
      await api.post(
        '/auth/flow/add-role',
        { newRole: targetRole },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setAdded(true)
      // Update localStorage roles immediately so the switcher reflects the change
      const stored = localStorage.getItem('user_roles')
      const current: string[] = stored ? JSON.parse(stored) : [user?.role || 'owner']
      const updated = [...new Set([...current, targetRole])]
      localStorage.setItem('user_roles', JSON.stringify(updated))
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to add role. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`rounded-xl border-2 p-5 ${meta.color}`}>
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5">{meta.icon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-gray-900 mb-1">{meta.title}</h4>
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{meta.description}</p>

          {added ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
              <CheckCircle2 className="w-5 h-5" />
              Role added! Reload the page to see the role switcher.
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 items-start">
              <button
                onClick={handleAddRole}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${meta.btnColor} disabled:opacity-50`}
              >
                <PlusCircle className="w-4 h-4" />
                {loading ? 'Adding…' : meta.cta}
              </button>
              {/* If the user needs to complete registration for the new role */}
              <a
                href={meta.registerHref}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors pt-2 sm:pt-2"
              >
                Or register a new {targetRole} account
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
