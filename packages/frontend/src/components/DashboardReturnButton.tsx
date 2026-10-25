'use client'

import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import { LayoutDashboard } from 'lucide-react'

export default function DashboardReturnButton() {
  const { isAuthenticated, activeRole, loading } = useAuth()

  if (loading || !isAuthenticated) return null

  let href = '/dashboard'
  if (activeRole === UserRole.ADMIN) href = '/admin'
  else if (activeRole === UserRole.VENDOR) href = '/vendor-portal'
  else if (activeRole === UserRole.AFFILIATE) href = '/sales-portal/dashboard'
  else if (activeRole === UserRole.PROMOTER) href = '/dashboard/promoter'
  else if (activeRole === UserRole.ARTIST) href = '/artist/dashboard'

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 bg-primary-600 text-white text-sm font-semibold px-3 py-2 rounded-lg hover:bg-primary-700 transition-colors"
    >
      <LayoutDashboard className="w-4 h-4" />
      Dashboard
    </Link>
  )
}
