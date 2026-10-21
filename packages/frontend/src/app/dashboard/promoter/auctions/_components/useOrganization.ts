'use client'

import { useCallback, useEffect, useState } from 'react'
import api from '@/lib/api'
import { AuctionOrganization, normalizeOrganization } from '../lib'

/** The promoter's organization profile. `org` is null when none exists or the endpoint is unavailable. */
export function useOrganization() {
  const [org, setOrg] = useState<AuctionOrganization | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setFailed(false)
    try {
      const res = await api.get('/auctions/manage/organization')
      setOrg(normalizeOrganization(res.data))
    } catch {
      setOrg(null)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { org, loading, failed, reload: load }
}
