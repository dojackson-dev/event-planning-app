import type { Metadata } from 'next'
import { clip, fetchPublic, pageMetadata, placeLine } from '@/lib/seo'

interface BookingLinkPreview {
  vendor_accounts: {
    business_name: string
    category: string | null
    bio: string | null
    city: string | null
    state: string | null
    profile_image_url: string | null
  } | null
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const link = await fetchPublic<BookingLinkPreview>(`/vendors/booking-link/${encodeURIComponent(params.slug)}`)
  const vendor = link?.vendor_accounts
  if (!vendor?.business_name) {
    return pageMetadata({
      title: 'Book a Vendor',
      description: 'Send a booking request through EventEcos.',
      path: `/book/${params.slug}`,
      image: '/lib/Vendors-Banner.jpg',
    })
  }

  const where = placeLine(vendor.city, vendor.state)
  const description = clip(
    [where, clip(vendor.bio, 170)].filter(Boolean).join(' — ') || 'Send a booking request through EventEcos.',
    220,
  )

  return pageMetadata({
    title: `Book ${vendor.business_name}`,
    description,
    path: `/book/${params.slug}`,
    image: vendor.profile_image_url || '/lib/Vendors-Banner.jpg',
    imageAlt: vendor.business_name,
    largeImage: false,
  })
}

export default function BookVendorLayout({ children }: { children: React.ReactNode }) {
  return children
}
