import * as zipcodes from 'zipcodes';

export interface PlaceSuggestion {
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  /** Miles from the origin zip; 0 for the origin itself. */
  distance: number;
}

const ZIP = /^\d{5}$/;

const toPlace = (
  hit: zipcodes.ZipCode | undefined,
  distance: number,
): PlaceSuggestion | null =>
  hit?.city && hit.state
    ? {
        city: hit.city,
        state: hit.state,
        zip: hit.zip,
        lat: hit.latitude,
        lng: hit.longitude,
        distance,
      }
    : null;

/** The city a US zip code belongs to, or null when the zip is not recognised. */
export function placeForZip(zip: string): PlaceSuggestion | null {
  if (!ZIP.test(zip)) return null;
  return toPlace(zipcodes.lookup(zip), 0);
}

/** Other cities within `miles` of a zip code, nearest first, one entry per city. */
export function nearbyCities(
  zip: string,
  miles = 25,
  limit = 6,
): PlaceSuggestion[] {
  const origin = placeForZip(zip);
  if (!origin) return [];
  const radius = Math.min(Math.max(Math.round(miles) || 25, 1), 50);
  const max = Math.min(Math.max(Math.round(limit) || 6, 1), 12);

  const nearest = new Map<string, PlaceSuggestion>();
  for (const other of zipcodes.radius(zip, radius) as unknown as string[]) {
    const distance = zipcodes.distance(zip, other);
    const place = toPlace(
      zipcodes.lookup(other),
      Math.round((distance || 0) * 10) / 10,
    );
    if (!place) continue;
    const key = `${place.city}|${place.state}`;
    if (key === `${origin.city}|${origin.state}`) continue;
    const seen = nearest.get(key);
    if (!seen || place.distance < seen.distance) nearest.set(key, place);
  }
  return [...nearest.values()]
    .sort((a, b) => a.distance - b.distance)
    .slice(0, max);
}
