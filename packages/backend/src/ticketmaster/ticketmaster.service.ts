import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TicketmasterEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  image_url: string | null;
  category: string | null;
  min_price: number | null;
  max_price: number | null;
  ticketmaster_url: string;
  source: 'ticketmaster';
}

interface CacheEntry {
  data: TicketmasterEvent[];
  expiresAt: number;
}

const CATEGORY_MAP: Record<string, string> = {
  Music: 'Music',
  Sports: 'Sports',
  'Arts & Theater': 'Arts & Theatre',
  Comedy: 'Comedy',
  Festival: 'Music',
  Conference: 'Conferences & Exhibitions',
  'Club Night': 'Music',
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class TicketmasterService {
  private readonly logger = new Logger(TicketmasterService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly zipCache = new Map<string, { lat: number; lng: number }>();
  private readonly baseUrl =
    'https://app.ticketmaster.com/discovery/v2/events.json';

  constructor(private readonly configService: ConfigService) {}

  // Ticketmaster's own `postalCode` param has unreliable geocoding for some
  // zip codes (returns 0 results even with a large radius, while a
  // neighboring zip in the same city works fine). Geocoding the zip
  // ourselves and using `latlong` sidesteps that.
  private async zipToLatLng(
    zip: string,
  ): Promise<{ lat: number; lng: number } | null> {
    const cached = this.zipCache.get(zip);
    if (cached) return cached;
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!res.ok) return null;
      const body = await res.json();
      const place = body?.places?.[0];
      if (!place) return null;
      const coords = {
        lat: parseFloat(place.latitude),
        lng: parseFloat(place.longitude),
      };
      this.zipCache.set(zip, coords);
      return coords;
    } catch {
      return null;
    }
  }

  async searchEvents(params: {
    zip_code?: string;
    radius_miles?: number;
    category?: string;
    keyword?: string;
    size?: number;
  }): Promise<TicketmasterEvent[]> {
    const apiKey = this.configService.get<string>('TICKETMASTER_API_KEY');
    if (!apiKey) return [];

    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const query = new URLSearchParams({ apikey: apiKey, sort: 'date,asc' });
    if (params.zip_code) {
      const coords = await this.zipToLatLng(params.zip_code);
      if (coords) {
        query.set('latlong', `${coords.lat},${coords.lng}`);
      } else {
        query.set('postalCode', params.zip_code);
      }
    }
    if (params.radius_miles) {
      query.set('radius', String(params.radius_miles));
      query.set('unit', 'miles');
    }
    if (params.category && CATEGORY_MAP[params.category]) {
      query.set('classificationName', CATEGORY_MAP[params.category]);
    }
    if (params.keyword) query.set('keyword', params.keyword);
    query.set('size', String(params.size ?? 20));
    // Only future events
    query.set(
      'startDateTime',
      new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    );

    try {
      const res = await fetch(`${this.baseUrl}?${query.toString()}`);
      if (!res.ok) {
        this.logger.warn(`Ticketmaster API returned ${res.status}`);
        return [];
      }
      const body = await res.json();
      const raw: any[] = body?._embedded?.events ?? [];

      const events: TicketmasterEvent[] = raw.map((e: any) => {
        const venue = e._embedded?.venues?.[0];
        const images: any[] = e.images ?? [];
        // Prefer 16x9 ratio image at ~640px wide
        const img =
          images.find((i: any) => i.ratio === '16_9' && i.width >= 600) ??
          images.find((i: any) => i.ratio === '16_9') ??
          images[0] ??
          null;
        const prices = e.priceRanges?.[0];
        const dateInfo = e.dates?.start;

        return {
          id: `tm_${e.id}`,
          title: e.name,
          event_date: dateInfo?.localDate ?? '',
          start_time: dateInfo?.localTime ?? null,
          venue_name: venue?.name ?? null,
          city: venue?.city?.name ?? null,
          state: venue?.state?.stateCode ?? null,
          image_url: img?.url ?? null,
          category: e.classifications?.[0]?.segment?.name ?? null,
          min_price: prices?.min ?? null,
          max_price: prices?.max ?? null,
          ticketmaster_url: e.url,
          source: 'ticketmaster' as const,
        };
      });

      this.cache.set(cacheKey, {
        data: events,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      this.logger.log(
        `Ticketmaster: ${events.length} events for ${JSON.stringify(params)}`,
      );
      return events;
    } catch (err) {
      this.logger.error('Ticketmaster API error', (err as Error).message);
      return [];
    }
  }
}
