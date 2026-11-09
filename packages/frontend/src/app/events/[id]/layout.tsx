import type { Metadata } from 'next'
import { clip, fetchPublic, formatEventWhen, pageMetadata, placeLine } from '@/lib/seo'

interface PublicEventPreview {
  title: string
  description: string | null
  event_date: string
  start_time: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  image_url: string | null
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const event = await fetchPublic<PublicEventPreview>(`/promoter-events/public/${encodeURIComponent(params.id)}`)
  if (!event?.title) {
    return pageMetadata({
      title: 'Event',
      description: 'See event details and get tickets on EventEcos.',
      path: `/events/${params.id}`,
      image: '/lib/Events-Banner.jpg',
    })
  }

  const when = formatEventWhen(event.event_date, event.start_time)
  const where = placeLine(event.venue_name, event.city, event.state)
  const lead = [when, where].filter(Boolean).join(' — ')
  const description = clip([lead, clip(event.description, 160)].filter(Boolean).join(' — '), 220)

  return pageMetadata({
    title: event.title,
    description: description || 'See event details and get tickets on EventEcos.',
    path: `/events/${params.id}`,
    image: event.image_url || '/lib/Events-Banner.jpg',
    imageAlt: event.title,
  })
}

export default function EventDetailLayout({ children }: { children: React.ReactNode }) {
  return children
}
