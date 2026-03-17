'use client'

/**
 * RoleSwitcher
 * Shown in both the owner DashboardLayout sidebar and the vendor-portal nav.
 * Only renders when the user has more than one role.
 *
 * Usage:
 *   <RoleSwitcher />
 *
 * The component reads roles and activeRole from AuthContext and lets the user
 * switch between dashboards instantly — no re-login required.
 */

import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import { Building2, Store, RefreshCcw } from 'lucide-react'

const ROLE_META: Record<string, { label: string; shortLabel: string; icon: React.ReactNode; accent: string }> = {
  [UserRole.OWNER]: {
    label: 'Venue Owner',
    shortLabel: 'Owner',
    icon: <Building2 className="w-4 h-4" />,
    accent: 'text-indigo-600',
  },
  [UserRole.VENDOR]: {
    label: 'Vendor',
    shortLabel: 'Vendor',
    icon: <Store className="w-4 h-4" />,
    accent: 'text-emerald-600',
  },
}

interface RoleSwitcherProps {
  /** 'sidebar' = vertical card for the owner DashboardLayout sidebar
   *  'banner'  = horizontal compact bar for the vendor portal header */
  variant?: 'sidebar' | 'banner'
}

export default function RoleSwitcher({ variant = 'sidebar' }: RoleSwitcherProps) {
  const { roles, activeRole, switchRole } = useAuth()

  // Only render if the user genuinely has more than one (non-admin) role
  const switchableRoles = roles.filter(r => r !== UserRole.ADMIN)
  if (switchableRoles.length <= 1) return null

  const otherRoles = switchableRoles.filter(r => r !== activeRole)
  if (otherRoles.length === 0) return null

  if (variant === 'banner') {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-sm">
        <RefreshCcw className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
        <span className="text-gray-600 hidden sm:inline">Switch to:</span>
        {otherRoles.map(role => {
          const meta = ROLE_META[role]
          if (!meta) return null
          return (
            <button
              key={role}
              onClick={() => switchRole(role)}
              className={`flex items-center gap-1 font-semibold ${meta.accent} hover:underline focus:outline-none`}
            >
              {meta.icon}
              {meta.shortLabel}
            </button>
          )
        })}
      </div>
    )
  }

  // ── sidebar variant ────────────────────────────────────────────────────────
  return (
    <div className="mx-3 mb-3 p-3 bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100 rounded-xl">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
        <RefreshCcw className="w-3 h-3" /> Switch Role
      </p>
      <div className="space-y-1.5">
        {otherRoles.map(role => {
          const meta = ROLE_META[role]
          if (!meta) return null
          return (
            <button
              key={role}
              onClick={() => switchRole(role)}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                bg-white border border-gray-200 text-sm font-medium text-gray-700
                hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50
                transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-200
              `}
            >
              <span className={meta.accent}>{meta.icon}</span>
              {meta.label} dashboard →
            </button>
          )
        })}
      </div>
    </div>
  )
}
