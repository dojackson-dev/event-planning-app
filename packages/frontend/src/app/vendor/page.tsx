'use client'

/**
 * /vendor — redirect shim
 *
 * There is no page at this path.  Anything that navigates here
 * (browser bookmark, stale cache, old link) is silently redirected
 * to the Vendor Portal home page.
 */
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VendorRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/vendor-portal')
  }, [router])

  // Render nothing while the redirect is in flight
  return null
}
