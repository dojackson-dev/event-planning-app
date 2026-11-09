import type { Metadata } from 'next'
import { clip, fetchPublic, pageMetadata, placeLine } from '@/lib/seo'

interface VendorPreview {
  business_name: string
  category: string | null
  bio: string | null
  city: string | null
  state: string | null
  profile_image_url: string | null
  cover_image_url: string | null
  gallery_images?: string[]
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const vendor = await fetchPublic<VendorPreview>(`/vendors/${encodeURIComponent(params.id)}`)
  if (!vendor?.business_name) {
    return pageMetadata({
      title: 'Vendor',
      description: 'See this vendor’s profile and send a booking request on EventEcos.',
      path: `/vendors/${params.id}`,
      image: '/lib/Vendors-Banner.jpg',
    })
  }

  const kind = (vendor.category ?? '').replace(/[_-]+/g, ' ')
  const where = placeLine(vendor.city, vendor.state)
  const lead = [kind && kind !== 'other' ? kind : '', where].filter(Boolean).join(' · ')
  const description = clip([lead, clip(vendor.bio, 170)].filter(Boolean).join(' — '), 220)

  // Their own photos first, then the banner, then the logo/profile picture.
  const photo = vendor.gallery_images?.[0] || vendor.cover_image_url
  const image = photo || vendor.profile_image_url || '/lib/Vendors-Banner.jpg'

  return pageMetadata({
    title: vendor.business_name,
    description: description || 'See this vendor’s profile and send a booking request on EventEcos.',
    path: `/vendors/${params.id}`,
    image,
    imageAlt: vendor.business_name,
    largeImage: !!photo,
  })
}

export default function VendorProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
