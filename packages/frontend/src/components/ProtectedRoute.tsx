'use client'

// AUTH BYPASS: Authentication disabled for development/demo purposes
// Set this to false to re-enable authentication
const BYPASS_AUTH = true

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Skip auth check when bypassed
    if (BYPASS_AUTH) return
    
    console.log('[PROTECTED] Effect - isAuth:', isAuthenticated, 'user:', user?.email)
    
    if (!isAuthenticated) {
      console.log('🔴 [PROTECTED] NOT authenticated - redirecting to /login')
      router.push('/login')
    } else {
      console.log('✅ [PROTECTED] Authenticated - allowing access')
    }
  }, [isAuthenticated, router, user])

  // Bypass authentication for development
  if (BYPASS_AUTH) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    console.log('[PROTECTED] Returning null - not authenticated')
    return null
  }

  console.log('[PROTECTED] Rendering children')
  return <>{children}</>
}
