'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import VendorNav from '@/components/VendorNav'
import ConnectBankButton from '@/components/ConnectBankButton'
import type { VendorProfile } from '@/lib/vendorTypes'

export default function PayoutsPage() {
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
      <VendorNav profile={profile} currentPage="Payouts" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-lg font-bold text-gray-900 mb-1">🏦 Bank Account &amp; Payouts</h1>
          <p className="text-sm text-gray-500 mb-6">
            Connect your bank account to receive payments from event owners directly through DoVenueSuite. Powered by Stripe.
          </p>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <h4 className="text-sm font-semibold text-blue-800 mb-2">💰 How vendor payouts work</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Funds arrive in your bank within 2 business days</li>
              <li>• Stripe handles all payment compliance and security</li>
            </ul>
            <div className="mt-3 space-y-2">
              <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                <span className="font-semibold">Owner-paid bookings:</span> DoVenueSuite collects a <strong>1.5% platform fee</strong> when an event owner pays you through the platform.
              </div>
              <div className="bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-800">
                <span className="font-semibold">Direct/general bookings:</span> DoVenueSuite collects a <strong>2.5% platform fee</strong> on payments from clients who book you directly.
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-sm text-amber-800">
            <p className="font-semibold mb-1">📄 Tax & Reporting Notice</p>
            <p>All payments in this system are processed through <strong>Stripe</strong>. Stripe may collect your EIN or SSN as required for payment processing and tax compliance. If you earn $600 or more in a calendar year, a <strong>1099 form will be issued by Stripe</strong> and made available directly in your Stripe account. DoVenueSuite does not issue 1099s.</p>
          </div>

          {profile && (
            <ConnectBankButton role="vendor" email={profile.email || ''} />
          )}
        </div>
      </div>
    </div>
  )
}
