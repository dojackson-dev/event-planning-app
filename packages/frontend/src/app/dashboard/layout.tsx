'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/components/DashboardLayout'

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  // Owner dashboard always uses DashboardLayout with sidebar
  // Promoter has their own layout at /dashboard/promoter/layout.tsx
  // This layout is only for owners/vendors/other roles
  
  return (
    <ProtectedRoute>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
