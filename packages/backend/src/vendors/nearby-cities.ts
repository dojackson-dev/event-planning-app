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

const STATE_NAMES: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
};

interface CityEntry {
  city: string;
  key: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  /** How many zip codes the city has; a good stand-in for how big it is. */
  size: number;
}

let cityIndex: CityEntry[] | null = null;

// Zip data spells these out ("Saint Louis", "Fort Worth"), people type the short forms.
const ABBREVIATIONS: Record<string, string> = {
  st: 'saint',
  ste: 'sainte',
  ft: 'fort',
  mt: 'mount',
  pt: 'port',
};

const norm = (v: string) =>
  v
    .toLowerCase()
    .replace(/[.']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => ABBREVIATIONS[word] ?? word)
    .join(' ');

function buildCityIndex(): CityEntry[] {
  const byCity = new Map<string, CityEntry>();
  for (const z of Object.values(zipcodes.codes) as zipcodes.ZipCode[]) {
    if (!z.city || !z.state || !ZIP.test(z.zip)) continue;
    const id = `${norm(z.city)}|${z.state}`;
    const seen = byCity.get(id);
    if (seen) {
      seen.size += 1;
      if (z.zip < seen.zip) {
        seen.zip = z.zip;
        seen.lat = z.latitude;
        seen.lng = z.longitude;
      }
    } else {
      byCity.set(id, {
        city: z.city,
        key: norm(z.city),
        state: z.state,
        zip: z.zip,
        lat: z.latitude,
        lng: z.longitude,
        size: 1,
      });
    }
  }
  return [...byCity.values()];
}

/** "jackson, mi" -> city part "jackson", state MI; accepts a 2-letter code or the full state name. */
function splitQuery(query: string): { city: string; state?: string } {
  const [cityPart, ...rest] = query.split(',');
  const city = norm(cityPart ?? '');
  const tail = norm(rest.join(' '));
  if (tail) {
    if (tail.length === 2) return { city, state: tail.toUpperCase() };
    const named = Object.keys(STATE_NAMES).filter((n) => n.startsWith(tail));
    if (named.length === 1) return { city, state: STATE_NAMES[named[0]] };
    return { city, state: undefined };
  }
  // "jackson ms" / "jackson mississippi" typed without a comma
  const words = city.split(' ');
  if (words.length > 1) {
    const last = words[words.length - 1];
    const head = words.slice(0, -1).join(' ');
    if (
      last.length === 2 &&
      Object.values(STATE_NAMES).includes(last.toUpperCase())
    )
      return { city: head, state: last.toUpperCase() };
    for (const name of Object.keys(STATE_NAMES)) {
      if (city.endsWith(` ${name}`))
        return {
          city: city.slice(0, -name.length - 1),
          state: STATE_NAMES[name],
        };
    }
  }
  return { city };
}

/** Type-ahead for cities and zip codes: cities starting with what was typed, biggest first. */
export function searchPlaces(query: string, limit = 8): PlaceSuggestion[] {
  const q = (query ?? '').trim();
  const max = Math.min(Math.max(Math.round(limit) || 8, 1), 15);
  if (/^\d{5}$/.test(q)) {
    const place = placeForZip(q);
    return place ? [place] : [];
  }
  const { city, state } = splitQuery(q);
  if (city.length < 2 || /\d/.test(city)) return [];

  cityIndex ??= buildCityIndex();
  const hits = cityIndex.filter(
    (c) => c.key.startsWith(city) && (!state || c.state === state),
  );
  // A full match counts for a lot, but a tiny town ("Atl") must not outrank a big city ("Atlanta") mid-typing.
  const weight = (c: CityEntry) => c.size * (c.key === city ? 5 : 1);
  hits.sort(
    (a, b) =>
      weight(b) - weight(a) ||
      b.size - a.size ||
      a.key.length - b.key.length ||
      a.key.localeCompare(b.key),
  );
  return hits.slice(0, max).map((c) => ({
    city: c.city,
    state: c.state,
    zip: c.zip,
    lat: c.lat,
    lng: c.lng,
    distance: 0,
  }));
}
