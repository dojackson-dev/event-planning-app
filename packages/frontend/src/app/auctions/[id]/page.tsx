import type { Metadata } from 'next'
import LegacyRoute from '@/components/auction/LegacyRoute'
import OrgPage from '@/components/auction/OrgPage'
import { buildMetadata } from '@/components/auction/seo'
import { serverGetOrganization, UUID_RE } from '@/lib/auctionApi'

interface Props {
  params: { id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Legacy UUID URLs keep the site-wide default metadata.
  if (UUID_RE.test(params.id)) return { title: 'Charity auction | EventEcos' }
  const result = await serverGetOrganization(params.id)
  if (result.status !== 'ok') return { title: 'Charity auctions | EventEcos' }
  const org = result.data.organization
  return buildMetadata({
    title: org.name,
    description: org.tagline || org.story,
    path: `/auctions/${org.slug || params.id}`,
    image: org.cover_image_url,
  })
}

/** `/auctions/<auction-uuid>` is the legacy auction page; any other segment is an organization slug. */
export default function Page({ params }: Props) {
  if (UUID_RE.test(params.id)) return <LegacyRoute id={params.id} view="auction" />
  return <OrgPage slug={params.id} />
}
