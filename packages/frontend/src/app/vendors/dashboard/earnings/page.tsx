'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import VendorNav from '@/components/VendorNav'
import type { VendorProfile, Booking } from '@/lib/vendorTypes'

export default function EarningsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    const load = async () => {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          api.get('/vendors/account/me'),
          api.get('/vendors/bookings/mine'),
        ])
        setProfile(profileRes.data)
        setBookings(bookingsRes.data || [])
      } catch (err: any) {
        if (err.response?.status === 401) router.replace('/vendors/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600" />
      </div>
    )
  }

  const paid      = bookings.filter(b => b.status === 'paid' || b.status === 'completed')
  const confirmed = bookings.filter(b => b.status === 'confirmed')
  const totalEarned  = paid.reduce((s, b) => s + (b.agreed_amount || 0), 0)
  const totalPending = confirmed.reduce((s, b) => s + (b.agreed_amount || 0), 0)

  const byMonth: Record<string, number> = {}
  paid.forEach(b => {
    const month = new Date(b.event_date).toLocaleString('default', { month: 'short', year: 'numeric' })
    byMonth[month] = (byMonth[month] || 0) + (b.agreed_amount || 0)
  })
  const months = Object.entries(byMonth).sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNav profile={profile} currentPage="Earnings" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h1 className="text-lg font-bold text-gray-900 mb-5">Earnings Breakdown</h1>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Total Earned</p>
              <p className="text-2xl font-bold text-green-600 mt-1">${totalEarned.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">{paid.length} paid booking{paid.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Pending (Confirmed)</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">${totalPending.toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-0.5">{confirmed.length} upcoming booking{confirmed.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-primary-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 font-medium">Avg per Booking</p>
              <p className="text-2xl font-bold text-primary-600 mt-1">
                ${paid.length > 0 ? Math.round(totalEarned / paid.length).toLocaleString() : '0'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">from completed events</p>
            </div>
          </div>

          {months.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Breakdown</h3>
              <div className="space-y-2">
                {months.map(([month, amount]) => {
                  const pct = Math.round((amount / totalEarned) * 100)
                  return (
                    <div key={month} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-28 flex-shrink-0">{month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-primary-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-gray-800 w-24 text-right">${amount.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">💸</p>
              <p>No completed earnings yet.</p>
              <p className="text-sm mt-1">Earnings appear once bookings are paid or marked complete.</p>
            </div>
          )}

          {paid.length > 0 && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Paid Booking History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b">
                      <th className="pb-2 pr-4">Event</th>
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paid.map(b => (
                      <tr key={b.id}>
                        <td className="py-2 pr-4 font-medium text-gray-800">{b.event_name}</td>
                        <td className="py-2 pr-4 text-gray-500">{new Date(b.event_date).toLocaleDateString()}</td>
                        <td className="py-2 text-right font-semibold text-green-700">${(b.agreed_amount || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
