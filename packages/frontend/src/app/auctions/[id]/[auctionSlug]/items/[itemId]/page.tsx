import type { Metadata } from 'next'
import SlugRoute from '@/components/auction/SlugRoute'
import { buildMetadata } from '@/components/auction/seo'
import { PublicAuction, PublicItem, serverGetPublic, serverGetStory, serverResolveAuction } from '@/lib/auctionApi'

interface Props {
  params: { id: string; auctionSlug: string; itemId: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const path = `/auctions/${params.id}/${params.auctionSlug}/items/${params.itemId}`
  const generic: Metadata = { title: 'Auction item | EventEcos' }
  const resolved = await serverResolveAuction(params.id, params.auctionSlug)
  if (resolved.status !== 'ok') return generic
  const [itemRes, story] = await Promise.all([
    serverGetPublic<{ auction: PublicAuction; item: PublicItem }>(`/items/${encodeURIComponent(params.itemId)}`),
    serverGetStory(resolved.data.auctionId),
  ])
  if (itemRes.status !== 'ok' || itemRes.data.item.auction_id !== resolved.data.auctionId) return generic
  const item = itemRes.data.item
  const auctionTitle = story.status === 'ok' ? story.data.auction.title : itemRes.data.auction?.title
  return buildMetadata({
    title: auctionTitle ? `${item.title} - ${auctionTitle}` : item.title,
    description: item.description || (story.status === 'ok' ? story.data.auction.description : null),
    path,
    image: item.image_urls?.[0] || (story.status === 'ok' ? story.data.auction.cover_image_url || story.data.organization?.cover_image_url : null),
  })
}

export default function Page({ params }: Props) {
  return <SlugRoute orgSlug={params.id} auctionSlug={params.auctionSlug} view="item" itemId={params.itemId} />
}
