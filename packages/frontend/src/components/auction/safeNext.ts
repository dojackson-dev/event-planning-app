/** Only same-site auction paths are honoured as post-login destinations (prevents open redirects). */
export function safeNext(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback
  if (!next.startsWith('/auctions/') || next.startsWith('//') || next.includes('\\')) return fallback
  return next
}
