'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ADMIN_EMAIL = 'admin@dovenuesuite.com'

interface AdminSession {
  user: any
  isAdmin: boolean
  loginTime: string
}

interface AdminContextType {
  session: AdminSession | null
  loading: boolean
  logout: () => void
  isAuthenticated: boolean
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAdminSession()
  }, [])

  const checkAdminSession = async () => {
    try {
      const stored = localStorage.getItem('admin_session')
      if (stored) {
        const parsed = JSON.parse(stored)
        
        // Verify with Supabase that session is still valid
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user && user.email?.toLowerCase() === ADMIN_EMAIL) {
          setSession(parsed)
        } else {
          // Invalid session, clear it
          localStorage.removeItem('admin_session')
          if (pathname?.startsWith('/admin') && pathname !== '/admin-login') {
            router.push('/admin-login')
          }
        }
      } else {
        if (pathname?.startsWith('/admin') && pathname !== '/admin-login') {
          router.push('/admin-login')
        }
      }
    } catch (error) {
      console.error('Error checking admin session:', error)
      localStorage.removeItem('admin_session')
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      localStorage.removeItem('admin_session')
      setSession(null)
      router.push('/admin-login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <AdminContext.Provider value={{
      session,
      loading,
      logout,
      isAuthenticated: !!session
    }}>
      {children}
    </AdminContext.Provider>
  )
}

export function useAdmin() {
  const context = useContext(AdminContext)
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider')
  }
  return context
}
