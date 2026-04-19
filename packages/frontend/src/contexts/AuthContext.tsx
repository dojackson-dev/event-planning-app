'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { User, AuthResponse, LoginCredentials, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  /** All roles this user has (e.g. ['owner', 'vendor']) */
  roles: UserRole[]
  /** The role the user is currently acting as */
  activeRole: UserRole | null
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  /** Switch the active role without re-logging-in */
  switchRole: (role: UserRole) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// ---------- helpers ----------

function getRoleDashboard(role: UserRole): string {
  if (role === UserRole.ADMIN)  return '/admin'
  if (role === UserRole.VENDOR) return '/vendors/dashboard'
  return '/dashboard'
}

function resolveRoles(backendRoles: string[], dbUser: any, email?: string): UserRole[] {
  // Always override for known admin e-mail
  if (email?.toLowerCase() === 'admin@dovenuesuite.com') return [UserRole.ADMIN]

  if (backendRoles && backendRoles.length > 0) {
    return backendRoles as UserRole[]
  }
  // Fall back to role from db user record
  const dbRole = dbUser?.role || dbUser?.user_metadata?.role
  return [dbRole || UserRole.OWNER] as UserRole[]
}

// ─────────────────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<User | null>(null)
  const [roles, setRoles]                 = useState<UserRole[]>([])
  const [activeRole, setActiveRoleState]  = useState<UserRole | null>(null)
  const [isClient, setIsClient]           = useState(false)
  const router = useRouter()

  // ── Load from localStorage (client only) ─────────────────────────────────
  useEffect(() => {
    setIsClient(true)

    const clearSession = () => {
      ;['access_token','refresh_token','user','user_roles','active_role','user_role'].forEach(k => localStorage.removeItem(k))
    }

    const init = async () => {
      try {
        const stored       = localStorage.getItem('user')
        const token        = localStorage.getItem('access_token')
        const storedRoles  = localStorage.getItem('user_roles')
        const storedActive = localStorage.getItem('active_role')
        const refreshTok   = localStorage.getItem('refresh_token')

        if (!stored || !token) return

        // ── Proactively refresh if the JWT is expired ────────────────────────
        // Decoding the exp claim client-side avoids the 401 flash on page load
        let activeToken = token
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          const isExpired = Date.now() >= payload.exp * 1000
          if (isExpired) {
            if (!refreshTok) {
              console.warn('⚠️ [INIT] Token expired, no refresh token — clearing session')
              clearSession()
              return
            }
            console.log('🔄 [INIT] Token expired — refreshing proactively...')
            const res = await api.post('/auth/refresh', { refresh_token: refreshTok })
            const { access_token, refresh_token: newRefresh } = res.data
            activeToken = access_token
            localStorage.setItem('access_token', access_token)
            if (newRefresh) localStorage.setItem('refresh_token', newRefresh)
            console.log('✅ [INIT] Token refreshed successfully')
          }
        } catch (refreshErr) {
          console.warn('⚠️ [INIT] Token refresh failed — clearing session', refreshErr)
          clearSession()
          return
        }
        // ─────────────────────────────────────────────────────────────────────

        const parsed: User = JSON.parse(stored)

        // Legacy e-mail overrides
        if (parsed.email?.toLowerCase() === 'admin@dovenuesuite.com') {
          parsed.role = UserRole.ADMIN
        }
        if (parsed.email?.toLowerCase() === 'larry@curesicklecell.org') {
          if (!storedRoles) parsed.role = UserRole.VENDOR
        }

        const parsedRoles: UserRole[] = storedRoles
          ? JSON.parse(storedRoles)
          : [parsed.role]

        const parsedActive: UserRole = (storedActive as UserRole) || parsedRoles[0]

        console.log('✅ [INIT] Loaded user:', parsed.email, 'roles:', parsedRoles, 'active:', parsedActive)
        setUser(parsed)
        setRoles(parsedRoles)
        setActiveRoleState(parsedActive)
      } catch (e) {
        console.error('[INIT] Error loading from localStorage:', e)
      }
    }

    init()
  }, [])

  // ── login ─────────────────────────────────────────────────────────────────
  const login = async (credentials: LoginCredentials) => {
    try {
      console.log('🔐 [LOGIN] Starting:', credentials.email)

      // Use the unified login endpoint — handles all role types and returns roles[]
      const response = await api.post('/auth/flow/unified/login', credentials)
      const { session, user: dbUser, roles: backendRoles } = response.data

      console.log('✅ [LOGIN] Got response:', dbUser?.email, 'roles:', backendRoles)

      const resolvedRoles = resolveRoles(backendRoles, dbUser, credentials.email)

      // Determine primary active role
      let activeR: UserRole = resolvedRoles[0]
      if (credentials.email?.toLowerCase() === 'admin@dovenuesuite.com') {
        activeR = UserRole.ADMIN
      }

      const newUser: User = {
        id:         dbUser.id,
        email:      dbUser.email || '',
        firstName:  dbUser.first_name  || dbUser.user_metadata?.first_name  || '',
        lastName:   dbUser.last_name   || dbUser.user_metadata?.last_name   || '',
        phone:      dbUser.phone_number || dbUser.user_metadata?.phone || '',
        role:       activeR,
        roles:      resolvedRoles,
        createdAt:  dbUser.created_at  || new Date().toISOString(),
        updatedAt:  dbUser.updated_at  || new Date().toISOString(),
      }

      // ── Persist ────────────────────────────────────────────────────────────
      console.log('💾 [LOGIN] Saving to localStorage')
      localStorage.setItem('access_token', session.access_token)
      localStorage.setItem('user',         JSON.stringify(newUser))
      localStorage.setItem('user_roles',   JSON.stringify(resolvedRoles))
      localStorage.setItem('active_role',  activeR)
      localStorage.setItem('user_role',    activeR)   // legacy key
      if (session.refresh_token) {
        localStorage.setItem('refresh_token', session.refresh_token)
      }

      setUser(newUser)
      setRoles(resolvedRoles)
      setActiveRoleState(activeR)

      await new Promise(r => setTimeout(r, 100))

      // ── Navigate ───────────────────────────────────────────────────────────
      if (resolvedRoles.length > 1 && activeR !== UserRole.ADMIN) {
        console.log('🚀 [LOGIN] Multiple roles — navigating to /choose-role')
        router.push('/choose-role')
      } else {
        const dest = getRoleDashboard(activeR)
        console.log('🚀 [LOGIN] Navigating to', dest)
        router.push(dest)
      }

    } catch (error: any) {
      console.error('❌ [LOGIN] Error:', error?.response?.data?.message || error?.message)
      throw error
    }
  }

  // ── switchRole ────────────────────────────────────────────────────────────
  const switchRole = (role: UserRole) => {
    if (!roles.includes(role)) return
    setActiveRoleState(role)
    if (user) {
      const updated = { ...user, role }
      setUser(updated)
      localStorage.setItem('user',        JSON.stringify(updated))
      localStorage.setItem('active_role', role)
      localStorage.setItem('user_role',   role)
    }
    router.push(getRoleDashboard(role))
  }

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    console.log('🚪 [LOGOUT]')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    localStorage.removeItem('user_roles')
    localStorage.removeItem('active_role')
    localStorage.removeItem('user_role')
    setUser(null)
    setRoles([])
    setActiveRoleState(null)
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading: !isClient,
      roles,
      activeRole,
      login,
      logout,
      switchRole,
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