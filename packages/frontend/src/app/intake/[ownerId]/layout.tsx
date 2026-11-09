import type { Metadata } from 'next'
import { fetchPublic, pageMetadata } from '@/lib/seo'

interface IntakePreview {
  businessName: string | null
  logoUrl: string | null
}

export async function generateMetadata({ params }: { params: { ownerId: string } }): Promise<Metadata> {
  const form = await fetchPublic<IntakePreview>(`/intake-forms/public-form/${encodeURIComponent(params.ownerId)}`)
  const path = `/intake/${params.ownerId}`
  if (!form?.businessName) {
    return pageMetadata({
      title: 'Request a Booking',
      description: 'Tell us about your event and we will get back to you.',
      path,
      image: '/lib/Venues-Banner.jpg',
    })
  }

  return pageMetadata({
    title: `Book ${form.businessName}`,
    description: `Tell ${form.businessName} about your event and get a response quickly. Request a date, a tour or a quote.`,
    path,
    image: form.logoUrl || '/lib/Venues-Banner.jpg',
    imageAlt: form.businessName,
    largeImage: !form.logoUrl,
  })
}

export default function IntakeLayout({ children }: { children: React.ReactNode }) {
  return children
}
