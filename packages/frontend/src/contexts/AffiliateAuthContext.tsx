'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface Affiliate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  referral_code: string
  status: string
  created_at: string
}

interface AffiliateAuthContextType {
  affiliate: Affiliate | null
  loading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AffiliateAuthContext = createContext<AffiliateAuthContextType | undefined>(undefined)

export function AffiliateAuthProvider({ children }: { children: ReactNode }) {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem('affiliate_data')
    const token  = localStorage.getItem('access_token')
    if (stored && token) {
      setAffiliate(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    // Use the same unified login as the main app
    const res = await api.post('/auth/flow/unified/login', { email, password })
    const { session } = res.data

    localStorage.setItem('access_token',  session.access_token)
    localStorage.setItem('refresh_token', session.refresh_token)

    // Fetch affiliate profile with the new token
    const affRes = await api.get('/affiliates/me', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const aff = affRes.data

    localStorage.setItem('affiliate_data', JSON.stringify(aff))

    setAffiliate(aff)
    router.push('/sales-portal/dashboard')
  }

  const logout = () => {
    ;['affiliate_data', 'access_token', 'refresh_token'].forEach(k => localStorage.removeItem(k))
    setAffiliate(null)
    router.push('/sales-portal/login')
  }

  return (
    <AffiliateAuthContext.Provider value={{
      affiliate,
      loading,
      isAuthenticated: !!affiliate,
      login,
      logout,
    }}>
      {children}
    </AffiliateAuthContext.Provider>
  )
}

export function useAffiliateAuth() {
  const ctx = useContext(AffiliateAuthContext)
  if (!ctx) throw new Error('useAffiliateAuth must be used within AffiliateAuthProvider')
  return ctx
}
