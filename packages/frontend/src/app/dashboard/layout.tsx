'use client'

import { usePathname } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import DashboardLayout from '@/components/DashboardLayout'

export default function DashboardLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Promoter and Artist have their own layouts — don't wrap with owner DashboardLayout
  if (pathname?.startsWith('/dashboard/promoter') || pathname?.startsWith('/dashboard/artist')) {
    return <>{children}</>
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ProtectedRoute>
  )
}
