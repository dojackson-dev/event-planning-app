import type { Metadata } from 'next'
import SlugRoute from '@/components/auction/SlugRoute'
import { buildMetadata } from '@/components/auction/seo'
import { serverGetStory, serverResolveAuction } from '@/lib/auctionApi'

interface Props {
  params: { id: string; auctionSlug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = `/auctions/${params.id}/${params.auctionSlug}`
  const resolved = await serverResolveAuction(params.id, params.auctionSlug)
  if (resolved.status !== 'ok') return { title: 'Charity auction | EventEcos' }
  const story = await serverGetStory(resolved.data.auctionId)
  if (story.status !== 'ok') return { title: 'Charity auction | EventEcos', alternates: { canonical: path } }
  const { auction, organization } = story.data
  return buildMetadata({
    title: organization ? `${auction.title} - ${organization.name}` : auction.title,
    description: auction.description || organization?.tagline || organization?.story,
    path,
    image: auction.cover_image_url || organization?.cover_image_url,
  })
}

export default function Page({ params }: Props) {
  return <SlugRoute orgSlug={params.id} auctionSlug={params.auctionSlug} view="auction" />
}
