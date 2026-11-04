'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

/**
 * Venues share one public link, the client intake link on the dashboard. This page used to hold a second
 * (booking) link, so anyone arriving here from an old bookmark is sent to the dashboard.
 * Links already shared as /book-venue/<name> keep working.
 */
export default function BookingLinkMovedPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [router])
  return (
    <div className="flex justify-center py-24 text-gray-400">
      <Loader2 className="h-6 w-6 animate-spin" />
    </div>
  )
}
