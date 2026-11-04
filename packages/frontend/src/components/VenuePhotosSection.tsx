'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'
import PhotoManager from '@/components/PhotoManager'

interface VenueOption {
  id: string | number
  name: string
}

/** Photos (up to 5 per venue) shown as a slideshow on the Find Venues page. Venue owners manage them here. */
export default function VenuePhotosSection({ onOpenVenueDetails }: { onOpenVenueDetails?: () => void }) {
  const [venues, setVenues] = useState<VenueOption[] | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<string>('')

  const load = () => {
    setError('')
    api
      .get<{ venues: VenueOption[] }>('/owner/venues')
      .then(res => {
        const list = res.data.venues || []
        setVenues(list)
        setSelected(prev => prev || (list[0] ? String(list[0].id) : ''))
      })
      .catch(err => setError(err.response?.data?.message || 'Could not load your venues.'))
  }

  useEffect(load, [])

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error} <button type="button" onClick={load} className="font-medium underline">Try again</button>
      </div>
    )
  }
  if (venues === null) {
    return <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading venues…</div>
  }
  if (venues.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Add your venue first, then come back here to add its photos.{' '}
        {onOpenVenueDetails && (
          <button type="button" onClick={onOpenVenueDetails} className="font-medium text-primary-600 underline">Go to Venue Details</button>
        )}
      </p>
    )
  }

  return (
    <div>
      {venues.length > 1 && (
        <div className="mb-4">
          <label htmlFor="venue-photos-venue" className="mb-1 block text-sm font-medium text-gray-700">Venue</label>
          <select
            id="venue-photos-venue"
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {venues.map(v => (
              <option key={String(v.id)} value={String(v.id)}>{v.name}</option>
            ))}
          </select>
        </div>
      )}
      {venues.length === 1 && <p className="mb-3 text-sm font-medium text-gray-700">{venues[0].name}</p>}
      {selected && <PhotoManager key={selected} endpoint={`/listing-photos/venue/${selected}`} uploadType="venue-photo" />}
    </div>
  )
}
