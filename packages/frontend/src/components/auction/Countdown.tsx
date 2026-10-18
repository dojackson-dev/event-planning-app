'use client'

import { useEffect, useState } from 'react'
import { formatDuration } from './format'

interface Props {
  endsAt: string | null
  offsetMs: number
  /** Shown when the time has passed. */
  endedLabel?: string
  prefix?: string
}

/** Ticks every second against the server's clock. Display only: the server decides when bidding closes. */
export default function Countdown({ endsAt, offsetMs, endedLabel = 'Closed', prefix = 'Ends in' }: Props) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!endsAt) return null
  const remaining = new Date(endsAt).getTime() - (now + offsetMs)
  if (remaining <= 0) return <span className="text-gray-500">{endedLabel}</span>
  const urgent = remaining < 5 * 60 * 1000
  return (
    <span role="timer" className={urgent ? 'font-semibold text-red-600' : 'text-gray-700'}>
      {prefix} {formatDuration(remaining)}
    </span>
  )
}
