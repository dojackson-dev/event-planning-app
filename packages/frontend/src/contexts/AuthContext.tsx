'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { User, AuthResponse, LoginCredentials, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isClient, setIsClient] = useState(false)
  const router = useRouter()

  // Load user from localStorage only on client side
  useEffect(() => {
    setIsClient(true)
    
    try {
      const stored = localStorage.getItem('user')
      const token = localStorage.getItem('access_token')
      
      if (stored && token) {
        const parsed = JSON.parse(stored)
        // Always force admin role for the admin email regardless of stored value
        if (parsed.email?.toLowerCase() === 'admin@dovenuesuite.com') {
          parsed.role = UserRole.ADMIN
        }
        // Always force vendor role for the vendor email regardless of stored value
        if (parsed.email?.toLowerCase() === 'larry@curesicklecell.org') {
          parsed.role = UserRole.VENDOR
        }
        console.log('✅ [INIT] Loaded user from localStorage:', parsed.email, 'role:', parsed.role)
        setUser(parsed)
      }
    } catch (e) {
      console.error('[INIT] Error loading from localStorage:', e)
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      const endpoint = process.env.NEXT_PUBLIC_USE_DEV_AUTH === 'true' ? '/auth/dev-login' : '/auth/login'
      console.log('🔐 [LOGIN] Starting:', credentials.email)
      
      const response = await api.post<AuthResponse>(endpoint, credentials)
      const { access_token, user: supabaseUser } = response.data
      
      console.log('✅ [LOGIN] Got response:', supabaseUser.email)
      
      const ADMIN_EMAIL = 'admin@dovenuesuite.com'
      const VENDOR_EMAIL = 'larry@curesicklecell.org'
      const metaRole = (supabaseUser as any).user_metadata?.role
      const resolvedRole = supabaseUser.email?.toLowerCase() === ADMIN_EMAIL
        ? UserRole.ADMIN
        : supabaseUser.email?.toLowerCase() === VENDOR_EMAIL
        ? UserRole.VENDOR
        : metaRole || UserRole.OWNER

      const newUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        firstName: (supabaseUser as any).user_metadata?.first_name || '',
        lastName: (supabaseUser as any).user_metadata?.last_name || '',
        role: resolvedRole,
        createdAt: (supabaseUser as any).created_at || new Date().toISOString(),
        updatedAt: (supabaseUser as any).updated_at || new Date().toISOString()
      }
      
      // Save to localStorage IMMEDIATELY
      console.log('💾 [LOGIN] Saving to localStorage')
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user', JSON.stringify(newUser))
      if ((response.data as any).refresh_token) {
        localStorage.setItem('refresh_token', (response.data as any).refresh_token)
      }
      
      // Verify
      const check = localStorage.getItem('user')
      console.log('✔️ [LOGIN] Verified - user in storage:', !!check)
      
      // Update state
      console.log('📝 [LOGIN] Setting React state')
      setUser(newUser)
      
      // Wait a moment
      await new Promise(r => setTimeout(r, 100))
      
      // Navigate based on role
      if (newUser.role === UserRole.ADMIN) {
        console.log('🚀 [LOGIN] Admin detected - navigating to /admin')
        router.push('/admin')
      } else {
        console.log('🚀 [LOGIN] Navigating to /dashboard')
        router.push('/dashboard')
      }
      
    } catch (error: any) {
      console.error('❌ [LOGIN] Error:', error?.response?.data?.message || error?.message)
      throw error
    }
  }

  const logout = () => {
    console.log('🚪 [LOGOUT]')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  // Always provide the context, but mark as loading during SSR
  return (
    <AuthContext.Provider value={{
      user,
      loading: !isClient,
      login,
      logout,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
