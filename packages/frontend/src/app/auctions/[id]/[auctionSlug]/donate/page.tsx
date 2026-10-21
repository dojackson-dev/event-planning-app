import type { Metadata } from 'next'
import SlugRoute from '@/components/auction/SlugRoute'

export const metadata: Metadata = { title: 'Donate an item | EventEcos' }

export default function Page({ params }: { params: { id: string; auctionSlug: string } }) {
  return <SlugRoute orgSlug={params.id} auctionSlug={params.auctionSlug} view="donate" />
}
