'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  console.log('[PROTECTED] Render - isAuth:', isAuthenticated, 'user:', user?.email)

  useEffect(() => {
    console.log('[PROTECTED] Effect - isAuth:', isAuthenticated, 'user:', user?.email)
    
    if (!isAuthenticated) {
      console.log('🔴 [PROTECTED] NOT authenticated - redirecting to /login')
      router.push('/login')
    } else {
      console.log('✅ [PROTECTED] Authenticated - allowing access')
    }
  }, [isAuthenticated, router, user])

  if (!isAuthenticated) {
    console.log('[PROTECTED] Returning null - not authenticated')
    return null
  }

  console.log('[PROTECTED] Rendering children')
  return <>{children}</>
}
