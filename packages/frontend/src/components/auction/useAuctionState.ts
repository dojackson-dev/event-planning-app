'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { auctionApi, bidderHeaders, AuctionStateResponse, ItemState, parseApiError } from '@/lib/auctionApi'

const POLL_MS = 3000
const MAX_BACKOFF_MS = 30000

interface Result {
  auctionState: AuctionStateResponse['auction'] | null
  items: Record<string, ItemState>
  /** Server clock minus client clock, so countdowns follow the server's time. */
  offsetMs: number
  error: string | null
  refresh: () => Promise<void>
}

/** Polls the cheap state endpoint; pauses while the tab is hidden and backs off on errors. */
export function useAuctionState(auctionId: string | undefined, enabled = true): Result {
  const [auctionState, setAuctionState] = useState<Result['auctionState']>(null)
  const [items, setItems] = useState<Record<string, ItemState>>({})
  const [offsetMs, setOffsetMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const failures = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(false)
  const active = useRef(true)

  const fetchOnce = useCallback(async () => {
    if (!auctionId || inFlight.current) return
    inFlight.current = true
    try {
      const res = await auctionApi.get<AuctionStateResponse>(`/${auctionId}/state`, { headers: bidderHeaders(auctionId) })
      if (!active.current) return
      const requestedAt = Date.now()
      setOffsetMs(new Date(res.data.now).getTime() - requestedAt)
      setAuctionState(res.data.auction)
      setItems(Object.fromEntries(res.data.items.map((i) => [i.id, i])))
      setError(null)
      failures.current = 0
    } catch (err) {
      if (!active.current) return
      failures.current += 1
      setError(parseApiError(err).message)
    } finally {
      inFlight.current = false
    }
  }, [auctionId])

  useEffect(() => {
    active.current = true
    if (!auctionId || !enabled) return
    const schedule = () => {
      const delay = Math.min(POLL_MS * 2 ** failures.current, MAX_BACKOFF_MS)
      timer.current = setTimeout(async () => {
        if (document.visibilityState === 'visible') await fetchOnce()
        if (active.current) schedule()
      }, delay)
    }
    fetchOnce().then(() => active.current && schedule())
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchOnce()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active.current = false
      if (timer.current) clearTimeout(timer.current)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [auctionId, enabled, fetchOnce])

  return { auctionState, items, offsetMs, error, refresh: fetchOnce }
}
