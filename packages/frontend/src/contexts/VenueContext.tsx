'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'
import api from '@/lib/api'

export interface VenueData {
  id: number
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
  setActiveVenue: (v: VenueData) => void
  venuesLoaded: boolean
}

const VenueContext = createContext<VenueContextType>({
  venues: [],
  activeVenue: null,
  setActiveVenue: () => {},
  venuesLoaded: false,
})

export function VenueProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [venues, setVenues] = useState<VenueData[]>([])
  const [activeVenue, setActiveVenueState] = useState<VenueData | null>(null)
  const [venuesLoaded, setVenuesLoaded] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      setVenuesLoaded(true)
      return
    }
    api.get('/owner/venues').then(res => {
      const rows: VenueData[] = res.data.venues || []
      setVenues(rows)

      const savedId = localStorage.getItem('activeVenueId')
      const saved = savedId ? rows.find(v => v.id === Number(savedId)) : null

      if (saved) {
        setActiveVenueState(saved)
      } else if (rows.length === 1) {
        // Auto-select when owner has exactly one venue
        setActiveVenueState(rows[0])
        localStorage.setItem('activeVenueId', String(rows[0].id))
      }
      setVenuesLoaded(true)
    }).catch(() => setVenuesLoaded(true))
  }, [user])

  const setActiveVenue = (v: VenueData) => {
    setActiveVenueState(v)
    localStorage.setItem('activeVenueId', String(v.id))
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
