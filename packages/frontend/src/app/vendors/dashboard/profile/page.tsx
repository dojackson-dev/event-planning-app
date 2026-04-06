'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import VendorNav from '@/components/VendorNav'
import VendorEditProfileTab from '@/components/VendorEditProfileTab'
import type { VendorProfile } from '@/lib/vendorTypes'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    api.get('/vendors/account/me')
      .then(res => setProfile(res.data))
      .catch((err: any) => {
        if (err.response?.status === 401) router.replace('/vendors/login')
      })
      .finally(() => setLoading(false))
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNav profile={profile} currentPage="Profile" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        {profile && (
          <VendorEditProfileTab
            profile={profile}
            onUpdate={(updated) => setProfile(prev => prev ? { ...prev, ...updated } : prev)}
          />
        )}
      </div>
    </div>
  )
}
