import type { Metadata } from 'next'

export const FALLBACK_IMAGE = '/lib/EventEcos-Web-Banner.jpg'

export function truncate(text: string | null | undefined, max = 160): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

interface Options {
  title: string
  description?: string | null
  /** Site-relative canonical path, e.g. /auctions/my-org. */
  path: string
  image?: string | null
}

/** Social/SEO metadata. Relative URLs resolve against `metadataBase` from the root layout. */
export function buildMetadata({ title, description, path, image }: Options): Metadata {
  const desc = truncate(description) || 'Bid in online charity auctions that support non-profit organizations on EventEcos.'
  const img = image || FALLBACK_IMAGE
  const fullTitle = `${title} | EventEcos`
  return {
    title: fullTitle,
    description: desc,
    alternates: { canonical: path },
    openGraph: { title: fullTitle, description: desc, url: path, siteName: 'EventEcos', type: 'website', images: [{ url: img, alt: title }] },
    twitter: { card: 'summary_large_image', title: fullTitle, description: desc, images: [img] },
  }
}

/** Only http(s) links are rendered as hrefs, whatever the API returned. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}
