'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Store } from 'lucide-react'
import type { VendorProfile } from '@/lib/vendorTypes'

interface VendorNavProps {
  profile: VendorProfile | null
  currentPage?: string
}

export default function VendorNav({ profile, currentPage }: VendorNavProps) {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_role')
    router.replace('/vendors/login')
  }

  return (
    <nav className="bg-white border-b sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vendors/dashboard" className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary-600" />
            <div>
              <p className="font-semibold text-gray-900 leading-none">
                {profile?.business_name || 'My Business'}
              </p>
              <p className="text-xs text-primary-500 font-semibold tracking-widest uppercase">VendorSuite</p>
            </div>
          </Link>
          {currentPage && (
            <>
              <span className="text-gray-300 hidden sm:inline">/</span>
              <span className="text-gray-600 text-sm font-medium hidden sm:inline">{currentPage}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Link href="/vendors/settings" className="text-sm text-gray-500 hover:text-gray-700">⚙️ Settings</Link>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-red-500 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  )
}
