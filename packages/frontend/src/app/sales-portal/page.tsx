'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SalesPortalRoot() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('affiliate_token')
    router.replace(token ? '/sales-portal/dashboard' : '/sales-portal/login')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  )
}
