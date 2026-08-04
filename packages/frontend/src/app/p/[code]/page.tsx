'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function PromoterShortLinkPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  useEffect(() => {
    const resolve = async () => {
      try {
        const res = await fetch(`${API_URL}/promoter/booking-link/s/${code}`)
        if (!res.ok) throw new Error('Not found')
        const { slug } = await res.json()
        router.replace(`/book-promoter/${slug}`)
      } catch {
        router.replace('/not-found')
      }
    }
    resolve()
  }, [code, router])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
    </div>
  )
}
