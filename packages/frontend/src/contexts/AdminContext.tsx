'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ADMIN_EMAIL = 'admin@eventecos.com'

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

  // The signed-in Supabase user is the source of truth; the stored copy is only a convenience.
  const checkAdminSession = async () => {
    const goToLogin = () => {
      if (pathname?.startsWith('/admin') && pathname !== '/admin-login') {
        router.push('/admin-login')
      }
    }
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user && user.email?.toLowerCase() === ADMIN_EMAIL) {
        let stored: AdminSession | null = null
        try {
          stored = JSON.parse(localStorage.getItem('admin_session') || 'null')
        } catch {
          stored = null
        }
        setSession(stored ?? { user, isAdmin: true, loginTime: new Date().toISOString() })
      } else {
        localStorage.removeItem('admin_session')
        goToLogin()
      }
    } catch (error) {
      console.error('Error checking admin session:', error)
      localStorage.removeItem('admin_session')
      goToLogin()
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
