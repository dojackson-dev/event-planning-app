/** Prefixes https:// when the user typed a bare domain (e.g. "mysite.com"). */
export function normalizeWebsite(value: string | null | undefined): string | undefined {
  const v = value?.trim()
  if (!v) return undefined
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}
