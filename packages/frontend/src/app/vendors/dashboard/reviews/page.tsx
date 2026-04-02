'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import VendorNav from '@/components/VendorNav'
import type { VendorProfile, Review } from '@/lib/vendorTypes'

export default function ReviewsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) { router.replace('/vendors/login'); return }

    const load = async () => {
      try {
        const profileRes = await api.get('/vendors/account/me')
        setProfile(profileRes.data)
        try {
          const revRes = await api.get(`/vendors/${profileRes.data.id}/reviews`)
          setReviews(revRes.data || [])
        } catch {}
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

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <VendorNav profile={profile} currentPage="Reviews" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/vendors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-lg font-bold text-gray-900">My Reviews</h1>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-yellow-500">{avgRating.toFixed(1)}</span>
                <div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <span key={n} className={`text-lg ${n <= Math.round(avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-3">⭐</p>
              <p className="font-medium">No reviews yet</p>
              <p className="text-sm mt-1">Reviews appear here once event owners rate your services</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map(review => (
                <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={`text-base ${n <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-gray-700">&ldquo;{review.review_text}&rdquo;</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
