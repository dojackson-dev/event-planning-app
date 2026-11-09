import type { Metadata } from 'next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
const SITE_NAME = 'EventEcos'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.eventecos.com').replace(/\/$/, '')

/** Link previews need a full address, so site images like /lib/x.jpg get the site's address in front. */
function absolute(url: string): string {
  return url.startsWith('/') ? `${SITE_URL}${url}` : url
}

/** Shortens text for link previews without cutting a word in half. */
export function clip(text: string | null | undefined, max = 200): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

interface PageMetadataInput {
  title: string
  description: string
  /** Path on this site, e.g. /events/123 */
  path: string
  /** Absolute URL, or a path under /public (resolved against metadataBase). */
  image?: string | null
  imageAlt?: string
  /** Logos and other square images look better as a small preview card. */
  largeImage?: boolean
}

/**
 * Link-preview tags (what iMessage, WhatsApp, Facebook and Slack show) for one page. A page's openGraph
 * replaces the site-wide one entirely, so every field is set here.
 */
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  largeImage = true,
}: PageMetadataInput): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`
  const imageUrl = image ? absolute(image) : undefined
  const images = imageUrl ? [{ url: imageUrl, alt: imageAlt ?? title }] : undefined
  return {
    title: fullTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      locale: 'en_US',
      type: 'website',
      images,
    },
    twitter: {
      card: image && largeImage ? 'summary_large_image' : 'summary',
      title: fullTitle,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}

/** Reads public data for a preview. Returns null on any problem so the page falls back to generic tags. */
export async function fetchPublic<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export function formatEventWhen(eventDate?: string | null, startTime?: string | null): string {
  if (!eventDate) return ''
  const [y, m, d] = eventDate.split('-').map(Number)
  if (!y || !m || !d) return ''
  const date = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  if (!startTime) return date
  const [hh, mm] = startTime.split(':').map(Number)
  if (Number.isNaN(hh)) return date
  const time = new Date(2000, 0, 1, hh, mm || 0).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} · ${time}`
}

export function placeLine(...parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(', ')
}
