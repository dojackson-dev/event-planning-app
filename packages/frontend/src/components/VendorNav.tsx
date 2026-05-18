'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Store, LogOut, Settings } from 'lucide-react'
import type { VendorProfile } from '@/lib/vendorTypes'
import RoleSwitcher from '@/components/RoleSwitcher'

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
    localStorage.removeItem('user_roles')
    localStorage.removeItem('active_role')
    router.replace('/vendors/login')
  }

  return (
    <nav className="bg-white border-b sticky top-0 z-10">
      {/* Row 1: brand + page title */}
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/vendors/dashboard" className="flex items-center gap-2">
          <Store className="w-5 h-5 text-primary-600" />
          <p className="font-semibold text-gray-900 leading-none">
            {profile?.business_name || 'My Business'}
          </p>
        </Link>
        {currentPage && (
          <>
            <span className="text-gray-300">/</span>
            <span className="text-gray-700 text-sm font-medium">{currentPage}</span>
          </>
        )}
      </div>
      {/* Row 2: actions */}
      <div className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 h-11 flex items-center gap-2">
          <RoleSwitcher variant="banner" />
          <div className="flex-1" />
          <Link
            href="/vendors/settings"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 bg-white hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Settings className="h-4 w-4" /> Settings
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </div>
    </nav>
  )
}
