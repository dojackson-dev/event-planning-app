'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: '/admin',
  vendor: '/vendors/dashboard',
  affiliate: '/sales-portal/dashboard',
  promoter: '/dashboard/promoter',
  artist: '/artist/dashboard',
}

/** Dashboard of the signed-in user, or null for anonymous payers who followed an emailed link. */
function signedInDashboard(): string | null {
  if (!localStorage.getItem('access_token')) return null
  const role = localStorage.getItem('active_role') || localStorage.getItem('user_role') || ''
  return ROLE_DASHBOARDS[role] ?? '/dashboard'
}

export default function PaidDashboardLink({ autoRedirect }: { autoRedirect: boolean }) {
  const [href, setHref] = useState<string | null>(null)

  useEffect(() => {
    setHref(signedInDashboard())
  }, [])

  useEffect(() => {
    if (!href || !autoRedirect) return
    const timer = setTimeout(() => { window.location.href = href }, 3000)
    return () => clearTimeout(timer)
  }, [href, autoRedirect])

  if (!href) return null

  return (
    <Link
      href={href}
      className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors text-sm"
    >
      <ArrowLeft className="w-4 h-4" /> {autoRedirect ? 'Returning to your dashboard…' : 'Back to Dashboard'}
    </Link>
  )
}
