/** Prefixes https:// when the user typed a bare domain (e.g. "mysite.com"). */
export function normalizeWebsite(value: string | null | undefined): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

/** Base URL of the site the user is on, so shared pay links never point at a different environment. */
export function siteOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000'
}
