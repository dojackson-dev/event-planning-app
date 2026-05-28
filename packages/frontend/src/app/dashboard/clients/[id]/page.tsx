'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function ClientDetailRedirectPage() {
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const id = params?.id as string
    if (!id) {
      router.replace('/dashboard/clients')
      return
    }
    api.get('/intake-forms/' + id)
      .then((res) => {
        const eventId = res.data?.event_id
        if (eventId) {
          router.replace('/dashboard/events/' + eventId + '/manage')
        } else {
          router.replace('/dashboard/clients')
        }
      })
      .catch(() => router.replace('/dashboard/clients'))
  }, [])

  return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      <p>Redirecting...</p>
    </div>
  )
}