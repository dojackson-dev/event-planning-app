'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import api from '@/lib/api'

interface WalletStatus {
  apple: boolean
  google: boolean
}

// One request for the whole page, however many tickets it shows.
let statusRequest: Promise<WalletStatus> | null = null
function loadWalletStatus(): Promise<WalletStatus> {
  if (!statusRequest) {
    statusRequest = api
      .get<WalletStatus>('/wallet/status')
      .then((r) => r.data)
      .catch(() => ({ apple: false, google: false }))
  }
  return statusRequest
}

/** Phones get their own wallet; computers (which could be sending the pass to either phone) get both. */
function walletsForDevice(): { apple: boolean; google: boolean } {
  const ua = navigator.userAgent
  const isApple = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && 'ontouchend' in document)
  const isAndroid = /Android/i.test(ua)
  if (isApple) return { apple: true, google: false }
  if (isAndroid) return { apple: false, google: true }
  return { apple: true, google: true }
}

export default function AddToWalletButtons({ ticketId }: { ticketId: string }) {
  const [shown, setShown] = useState<WalletStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    loadWalletStatus().then((available) => {
      if (cancelled) return
      const device = walletsForDevice()
      setShown({ apple: available.apple && device.apple, google: available.google && device.google })
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!shown || (!shown.apple && !shown.google)) return null

  const base = api.defaults.baseURL ?? ''
  const buttonClass =
    'inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800'

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2">
      {shown.apple && (
        <a href={`${base}/wallet/apple/${ticketId}`} className={buttonClass}>
          <Wallet className="h-4 w-4" aria-hidden="true" />
          Add to Apple Wallet
        </a>
      )}
      {shown.google && (
        <a href={`${base}/wallet/google/${ticketId}`} className={buttonClass}>
          <Wallet className="h-4 w-4" aria-hidden="true" />
          Add to Google Wallet
        </a>
      )}
    </div>
  )
}
