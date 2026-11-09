import type { Metadata } from 'next'
import { clip, fetchPublic, pageMetadata, placeLine } from '@/lib/seo'

interface VenuePreview {
  name: string
  city: string | null
  state: string | null
  capacity: number | null
  description: string | null
  profile_image_url: string | null
  cover_image_url?: string | null
  photos?: string[]
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const venue = await fetchPublic<VenuePreview>(`/vendors/venue/${encodeURIComponent(params.id)}`)
  if (!venue?.name) {
    return pageMetadata({
      title: 'Venue',
      description: 'See this venue and send a booking request on EventEcos.',
      path: `/venues/${params.id}`,
      image: '/lib/Venues-Banner.jpg',
    })
  }

  const where = placeLine(venue.city, venue.state)
  const lead = [where, venue.capacity ? `Up to ${venue.capacity} guests` : ''].filter(Boolean).join(' · ')
  const description = clip([lead, clip(venue.description, 170)].filter(Boolean).join(' — '), 220)

  const photo = venue.photos?.[0] || venue.cover_image_url
  const image = photo || venue.profile_image_url || '/lib/Venues-Banner.jpg'

  return pageMetadata({
    title: venue.name,
    description: description || 'See this venue and send a booking request on EventEcos.',
    path: `/venues/${params.id}`,
    image,
    imageAlt: venue.name,
    largeImage: !!photo,
  })
}

export default function VenueProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
