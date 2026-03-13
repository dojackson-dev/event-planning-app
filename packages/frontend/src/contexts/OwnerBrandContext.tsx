'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface OwnerBrand {
  logoUrl: string | null
  businessName: string
  loading: boolean
  updateLogo: (url: string | null) => Promise<void>
  refetch: () => void
}

const OwnerBrandContext = createContext<OwnerBrand>({
  logoUrl: null,
  businessName: '',
  loading: true,
  updateLogo: async () => {},
  refetch: () => {},
})

export function OwnerBrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    if (!user) { setLoading(false); return }
    try {
      const res = await api.get('/owner/profile')
      setLogoUrl(res.data.logoUrl)
      setBusinessName(res.data.businessName)
    } catch {
      // Silently fail — non-owners or network issues
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const updateLogo = async (url: string | null) => {
    await api.put('/owner/profile', { logoUrl: url })
    setLogoUrl(url)
  }

  return (
    <OwnerBrandContext.Provider value={{ logoUrl, businessName, loading, updateLogo, refetch: fetchProfile }}>
      {children}
    </OwnerBrandContext.Provider>
  )
}

export const useOwnerBrand = () => useContext(OwnerBrandContext)
