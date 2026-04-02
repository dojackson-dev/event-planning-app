'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VendorPortalRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/vendors/dashboard')
  }, [router])
  return null
}