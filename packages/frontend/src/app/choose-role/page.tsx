'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import { Building2, Store, ArrowRight } from 'lucide-react'

const ROLE_CONFIG: Record<string, {
  label: string
  description: string
  icon: React.ReactNode
  color: string
  border: string
  hover: string
}> = {
  [UserRole.OWNER]: {
    label: 'Venue Owner',
    description: 'Manage your venues, events, clients, bookings, and contracts.',
    icon: <Building2 className="w-10 h-10" />,
    color: 'text-indigo-600',
    border: 'border-indigo-200',
    hover: 'hover:border-indigo-500 hover:bg-indigo-50',
  },
  [UserRole.VENDOR]: {
    label: 'Vendor',
    description: 'View your bookings, manage your profile, and connect with venues.',
    icon: <Store className="w-10 h-10" />,
    color: 'text-emerald-600',
    border: 'border-emerald-200',
    hover: 'hover:border-emerald-500 hover:bg-emerald-50',
  },
}

export default function ChooseRolePage() {
  const { user, roles, switchRole, isAuthenticated, loading } = useAuth()
  const router = useRouter()

  // Redirect unauthenticated visitors to login
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login')
    }
    // If somehow only one role, go directly to the right dashboard
    if (!loading && isAuthenticated && roles.length === 1) {
      if (roles[0] === UserRole.VENDOR) router.push('/vendor-portal')
      else if (roles[0] === UserRole.ADMIN) router.push('/admin')
      else router.push('/dashboard')
    }
  }, [loading, isAuthenticated, roles, router])

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    )
  }

  const displayRoles = roles.filter(r => r !== UserRole.ADMIN)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="mb-10 text-center max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-2xl">🎭</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Choose Your View</h1>
        <p className="text-gray-500 text-base">
          Welcome back, <span className="font-semibold text-gray-700">{user?.firstName || user?.email}</span>!
          Your account has multiple roles — which dashboard would you like to open?
        </p>
      </div>

      {/* Role Cards */}
      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl">
        {displayRoles.map((role) => {
          const cfg = ROLE_CONFIG[role]
          if (!cfg) return null
          return (
            <button
              key={role}
              onClick={() => switchRole(role)}
              className={`
                flex-1 group relative bg-white rounded-2xl border-2 p-8
                text-left transition-all duration-200 shadow-sm
                ${cfg.border} ${cfg.hover}
                focus:outline-none focus:ring-4 focus:ring-indigo-200
              `}
            >
              <div className={`mb-4 ${cfg.color}`}>{cfg.icon}</div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{cfg.label}</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">{cfg.description}</p>
              <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${cfg.color}`}>
                Go to {cfg.label} dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </span>

              {/* Active badge when this is the current role */}
            </button>
          )
        })}
      </div>

      {/* Footer note */}
      <p className="mt-8 text-xs text-gray-400 text-center">
        You can switch between dashboards at any time using the role switcher in the nav.
      </p>
    </div>
  )
}
