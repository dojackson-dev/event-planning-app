import type { Metadata } from 'next'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Find Vendors',
  description:
    'Browse caterers, DJs, photographers, florists and more event vendors near you, and book them on EventEcos.',
  path: '/vendors',
  image: '/lib/Vendors-Banner.jpg',
  imageAlt: 'Event vendors on EventEcos',
})

export default function VendorsLayout({ children }: { children: React.ReactNode }) {
  return children
}
