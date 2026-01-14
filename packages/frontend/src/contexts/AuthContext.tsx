'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { User, AuthResponse, LoginCredentials } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (credentials: LoginCredentials, redirectPath?: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('access_token')
    const storedUser = localStorage.getItem('user')
    
    if (token && storedUser) {
      setUser(JSON.parse(storedUser))
    } else {
      // Temporary: Create a mock admin user for testing
      const mockAdmin = {
        id: '1',
        email: 'admin@dovenue.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'owner',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setUser(mockAdmin)
      localStorage.setItem('user', JSON.stringify(mockAdmin))
      localStorage.setItem('access_token', 'mock-token')
    }
    setLoading(false)
  }, [])

  const login = async (credentials: LoginCredentials, redirectPath?: string) => {
    try {
      const response = await api.post<AuthResponse>('/auth/login', credentials)
      const { access_token, user: supabaseUser } = response.data
      
      // Transform Supabase user to our User interface
      const user: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        firstName: supabaseUser.user_metadata?.first_name || '',
        lastName: supabaseUser.user_metadata?.last_name || '',
        role: supabaseUser.user_metadata?.role || 'owner',
        createdAt: supabaseUser.created_at || new Date().toISOString(),
        updatedAt: supabaseUser.updated_at || new Date().toISOString()
      }
      
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('user', JSON.stringify(user))
      setUser(user)
      
      // Route based on user role if no specific redirect path provided
      const finalRedirect = redirectPath || (user.role === 'customer' ? '/customer' : '/dashboard')
      router.push(finalRedirect)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    setUser(null)
    router.push('/login')
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
