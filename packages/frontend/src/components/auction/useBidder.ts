'use client'

import { useCallback, useEffect, useState } from 'react'
import { auctionApi, bidderHeaders, BidderMe, clearBidderToken, getBidderToken, parseApiError } from '@/lib/auctionApi'

/** Loads the signed-in bidder's profile for an auction. `me` is null when signed out. */
export function useBidder(auctionId: string | undefined) {
  const [me, setMe] = useState<BidderMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!auctionId) return
    if (!getBidderToken(auctionId)) {
      setMe(null)
      setLoading(false)
      return
    }
    try {
      const res = await auctionApi.get<BidderMe>('/bidder/me', { headers: bidderHeaders(auctionId) })
      setMe(res.data)
      setError(null)
    } catch (err) {
      const failure = parseApiError(err)
      if (failure.status === 401) {
        clearBidderToken(auctionId)
        setMe(null)
      } else {
        setError(failure.message)
      }
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    reload()
  }, [reload])

  const signOut = useCallback(() => {
    if (auctionId) clearBidderToken(auctionId)
    setMe(null)
  }, [auctionId])

  return { me, loading, error, reload, signOut }
}
