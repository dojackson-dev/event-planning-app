'use client'

// AUTH BYPASS: Authentication disabled for development/demo purposes
// Set this to false to re-enable authentication
const BYPASS_AUTH = true

import { useAuth } from '@/contexts/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Redirect admin users away from /dashboard to /admin
    if (user?.role === 'admin' && pathname?.startsWith('/dashboard')) {
      router.push('/admin')
      return
    }
    // Redirect vendor users away from /dashboard to /vendor-portal
    if (user?.role === 'vendor' && pathname?.startsWith('/dashboard')) {
      router.push('/vendor-portal')
      return
    }

    // Skip auth check when bypassed
    if (BYPASS_AUTH) return
    
    console.log('[PROTECTED] Effect - isAuth:', isAuthenticated, 'user:', user?.email)
    
    if (!isAuthenticated) {
      console.log('🔴 [PROTECTED] NOT authenticated - redirecting to /login')
      router.push('/login')
    } else {
      console.log('✅ [PROTECTED] Authenticated - allowing access')
    }
  }, [isAuthenticated, router, user, pathname])

  // Bypass authentication for development
  if (BYPASS_AUTH) {
    // Still redirect admin even when bypassed
    if (user?.role === 'admin' && typeof window !== 'undefined' && window.location.pathname?.startsWith('/dashboard')) {
      return null
    }
    // Still redirect vendor even when bypassed
    if (user?.role === 'vendor' && typeof window !== 'undefined' && window.location.pathname?.startsWith('/dashboard')) {
      return null
    }
    return <>{children}</>
  }

  if (!isAuthenticated) {
    console.log('[PROTECTED] Returning null - not authenticated')
    return null
  }

  console.log('[PROTECTED] Rendering children')
  return <>{children}</>
}
