import { redirectShortLink } from '@/lib/shortLink'

export const dynamic = 'force-dynamic'

export default async function ShortLinkPage({ params }: { params: { code: string } }) {
  return redirectShortLink('b', params.code)
}
