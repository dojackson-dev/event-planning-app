import { notFound, redirect } from 'next/navigation'

export type ShortLinkKind = 'b' | 'a' | 'p' | 'v'

/**
 * Old short booking links (/b vendors, /a artists, /p promoters, /v venues) still circulate in emails and bios.
 * Resolved on the server, so the visitor gets a real redirect instead of a page that must run JavaScript first.
 */
export async function redirectShortLink(kind: ShortLinkKind, code: string): Promise<never> {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  let path: string | null = null
  for (let attempt = 0; attempt < 2 && !path; attempt++) {
    try {
      const res = await fetch(`${base}/short-links/${kind}/${encodeURIComponent(code)}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      if (res.status === 404) break
      if (res.ok) {
        const data = await res.json()
        // Only ever redirect to our own booking pages.
        if (typeof data.path === 'string' && /^\/book[a-z-]*\/[^/]+$/.test(data.path)) path = data.path
      }
    } catch {
      // a cold or briefly unreachable backend gets one more try
    }
  }
  if (path) redirect(path)
  notFound()
}
