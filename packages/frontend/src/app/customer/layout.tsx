'use client'

import ProtectedRoute from '@/components/ProtectedRoute'
import CustomerLayout from '@/components/CustomerLayout'

export default function CustomerLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <CustomerLayout>
        {children}
      </CustomerLayout>
    </ProtectedRoute>
  )
}
