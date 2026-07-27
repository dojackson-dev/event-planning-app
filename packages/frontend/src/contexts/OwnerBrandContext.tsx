'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

interface OwnerBrand {
  logoUrl: string | null
  coverImageUrl: string | null
  businessName: string
  loading: boolean
  updateLogo: (url: string | null) => Promise<void>
  updateCover: (url: string | null) => Promise<void>
  updateBusinessName: (name: string) => Promise<void>
  refetch: () => void
}

const OwnerBrandContext = createContext<OwnerBrand>({
  logoUrl: null,
  coverImageUrl: null,
  businessName: '',
  loading: true,
  updateLogo: async () => {},
  updateCover: async () => {},
  updateBusinessName: async () => {},
  refetch: () => {},
})

export function OwnerBrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null)
  const [businessName, setBusinessName] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchProfile = async () => {
    if (!user) { setLoading(false); return }
    // Only fetch owner profile for owner/planner roles
    if (user.role !== 'owner' && user.role !== 'planner') { setLoading(false); return }
    try {
      const res = await api.get('/owner/profile')
      setLogoUrl(res.data.logoUrl)
      setCoverImageUrl(res.data.coverImageUrl || null)
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

  const updateCover = async (url: string | null) => {
    await api.put('/owner/profile', { coverImageUrl: url })
    setCoverImageUrl(url)
  }

  const updateBusinessName = async (name: string) => {
    await api.put('/owner/profile', { businessName: name })
    setBusinessName(name)
  }

  return (
    <OwnerBrandContext.Provider value={{ logoUrl, coverImageUrl, businessName, loading, updateLogo, updateCover, updateBusinessName, refetch: fetchProfile }}>
      {children}
    </OwnerBrandContext.Provider>
  )
}

export const useOwnerBrand = () => useContext(OwnerBrandContext)
