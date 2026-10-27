export interface PlaceHit {
  city: string
  state: string
  zip: string
  lat?: number
  lng?: number
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export const placeLabel = (p: { city: string; state: string }) => [p.city, p.state].filter(Boolean).join(', ')

/** Cities (or one exact zip code) matching what has been typed so far. */
export async function searchPlaces(query: string, signal?: AbortSignal, limit = 6): Promise<PlaceHit[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const res = await fetch(`${API}/vendors/geocode/places?q=${encodeURIComponent(q)}&limit=${limit}`, { signal })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

/** The best match for text that was typed but not picked from the list. */
export async function resolvePlace(text: string): Promise<PlaceHit | null> {
  try {
    const [first] = await searchPlaces(text, undefined, 1)
    return first ?? null
  } catch {
    return null
  }
}
