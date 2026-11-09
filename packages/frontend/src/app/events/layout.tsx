import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Events Near You',
  description:
    'Find concerts, festivals, nonprofit fundraisers and community events happening near you, and get your tickets on EventEcos.',
  path: '/events',
  image: '/lib/Events-Banner.jpg',
  imageAlt: 'Events on EventEcos',
})

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children
}
