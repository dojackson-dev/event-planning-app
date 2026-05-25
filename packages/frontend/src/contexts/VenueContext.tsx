'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import api from '@/lib/api'

export interface VenueData {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  phone?: string
  website?: string
  capacity?: string
  description?: string
}

interface VenueContextType {
  venues: VenueData[]
  activeVenue: VenueData | null
  setActiveVenue: (v: VenueData | null) => void
  venuesLoaded: boolean
}

const VenueContext = createContext<VenueContextType>({
  venues: [],
  activeVenue: null,
  setActiveVenue: () => {},
  venuesLoaded: false,
})

export function VenueProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [venues, setVenues] = useState<VenueData[]>([])
  const [activeVenue, setActiveVenueState] = useState<VenueData | null>(null)
  const [venuesLoaded, setVenuesLoaded] = useState(false)

  useEffect(() => {
    console.log('[VenueCtx] effect fired — authLoading:', authLoading, 'user.role:', user?.role)
    if (authLoading) return  // wait for auth to finish initialising
    if (!user || user.role !== 'owner') {
      console.log('[VenueCtx] not owner — setting venuesLoaded=true, activeVenue stays null')
      setVenuesLoaded(true)
      return
    }
    api.get('/owner/venues').then(res => {
      const rows: VenueData[] = (res.data.venues || []).map((v: any) => ({
        ...v,
        id: String(v.id),
      }))
      const savedId = localStorage.getItem('activeVenueId')
      const saved = savedId ? rows.find(v => v.id === savedId) : null
      console.log('[VenueCtx] venues loaded:', rows.length, '| savedId:', savedId, '| matched:', saved?.name ?? 'none')
      setVenues(rows)
      if (saved) {
        setActiveVenueState(saved)
      } else if (rows.length === 1) {
        setActiveVenueState(rows[0])
        localStorage.setItem('activeVenueId', String(rows[0].id))
      }
      setVenuesLoaded(true)
    }).catch(() => setVenuesLoaded(true))
  }, [user, authLoading])

  const setActiveVenue = (v: VenueData | null) => {
    console.log('[VenueCtx] setActiveVenue called with:', v?.name ?? 'null')
    setActiveVenueState(v)
    if (v) {
      localStorage.setItem('activeVenueId', String(v.id))
    } else {
      localStorage.removeItem('activeVenueId')
    }
  }

  return (
    <VenueContext.Provider value={{ venues, activeVenue, setActiveVenue, venuesLoaded }}>
      {children}
    </VenueContext.Provider>
  )
}

export function useVenue() {
  return useContext(VenueContext)
}
