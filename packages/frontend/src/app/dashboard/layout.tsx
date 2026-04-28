'use client'

import { useAuth } from '@/contexts/AuthContext'
import { UserRole } from '@/types'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/components/DashboardLayout'

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const { activeRole } = useAuth()

  // Promoter has its own isolated layout in /dashboard/promoter/layout.tsx
  // Don't wrap it with the owner DashboardLayout
  if (activeRole === UserRole.PROMOTER) {
    return (
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
    )
  }

  // Owner, vendor, and other roles use the standard DashboardLayout
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
