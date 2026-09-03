'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Building2, Send, AlertCircle, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface BookingLinkInfo {
  id: string
  slug: string
  is_active: boolean
  custom_message: string | null
  owner_accounts: {
    business_name: string
    logo_url: string | null
    intake_slug: string | null
  }
}

export default function PublicVenueBookingPage() {
  const params = useParams()
  const slug = params.slug as string

  const [linkInfo, setLinkInfo] = useState<BookingLinkInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const res = await fetch(`${API_URL}/owner/booking-link/${slug}`)
        if (!res.ok) throw new Error('Not found')
        setLinkInfo(await res.json())
      } catch {
        setError('This booking link is not available.')
      } finally {
        setLoading(false)
      }
    }
    fetchLink()
  }, [slug])

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>

  if (error && !linkInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-10 max-w-md w-full text-center shadow-sm">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Not Available</h1>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!linkInfo) return null
  const owner = linkInfo.owner_accounts
  const intakeHref = owner.intake_slug ? `/intake/${owner.intake_slug}` : null

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-xl w-full">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6 text-center">
          {owner.logo_url ? (
            <img src={owner.logo_url} alt={owner.business_name} className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-orange-100 shadow" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-orange-500" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{owner.business_name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Venue</p>
        </div>

        {linkInfo.custom_message && (
          <div className="bg-orange-50 border border-orange-100 text-orange-800 rounded-xl p-4 mb-5 text-sm text-center">{linkInfo.custom_message}</div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">Ready to Book?</h2>
          <p className="text-sm text-gray-500 mb-6">Tell us about your event and we&apos;ll be in touch to confirm the details.</p>
          {intakeHref ? (
            <Link href={intakeHref}
              className="inline-flex items-center justify-center gap-2 bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-orange-700 transition-colors text-base">
              <Send className="w-5 h-5" /> Start Your Booking Request
            </Link>
          ) : (
            <p className="text-sm text-red-500">This booking form is temporarily unavailable. Please contact {owner.business_name} directly.</p>
          )}
        </div>
      </div>
    </div>
  )
}

