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
import { Building2, Store, RefreshCcw, Megaphone, Mic2 } from 'lucide-react'

const ROLE_META: Record<string, { label: string; shortLabel: string; icon: React.ReactNode; accent: string }> = {
  [UserRole.OWNER]: {
    label: 'Venue Owner',
    shortLabel: 'Owner',
    icon: <Building2 className="w-4 h-4" />,
    accent: 'text-orange-600',
  },
  [UserRole.VENDOR]: {
    label: 'Vendor',
    shortLabel: 'Vendor',
    icon: <Store className="w-4 h-4" />,
    accent: 'text-blue-600',
  },
  [UserRole.PROMOTER]: {
    label: 'Event Promoter',
    shortLabel: 'Promoter',
    icon: <Megaphone className="w-4 h-4" />,
    accent: 'text-purple-600',
  },
  [UserRole.ARTIST]: {
    label: 'Artist',
    shortLabel: 'Artist',
    icon: <Mic2 className="w-4 h-4" />,
    accent: 'text-blue-600',
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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-sm">
        <RefreshCcw className="w-3.5 h-3.5 text-purple-500 shrink-0" />
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
    <div className="mx-3 mb-3 p-3 bg-gradient-to-r from-purple-50 to-orange-50 border border-purple-100 rounded-xl">
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
                hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50
                transition-colors focus:outline-none focus:ring-2 focus:ring-purple-200
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
