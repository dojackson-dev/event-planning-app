import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Find Venues',
  description:
    'Discover event venues for weddings, parties, corporate events and more, and send a booking request on EventEcos.',
  path: '/venues',
  image: '/lib/Venues-Banner.jpg',
  imageAlt: 'Event venues on EventEcos',
})

export default function VenuesLayout({ children }: { children: React.ReactNode }) {
  return children
}
