import SlugRoute from '@/components/auction/SlugRoute'

export default function Page({ params }: { params: { id: string; auctionSlug: string } }) {
  return <SlugRoute orgSlug={params.id} auctionSlug={params.auctionSlug} view="my-bids" />
}
