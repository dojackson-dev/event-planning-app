import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SeatGeekEvent {
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
  seatgeek_url: string;
  source: 'seatgeek';
}

interface CacheEntry {
  data: SeatGeekEvent[];
  expiresAt: number;
}

const TAXONOMY_MAP: Record<string, string> = {
  Music: 'concert',
  Sports: 'sports',
  'Arts & Theater': 'theater',
  Comedy: 'comedy',
  Festival: 'concert',
  Conference: 'conference',
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class SeatGeekService {
  private readonly logger = new Logger(SeatGeekService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly baseUrl = 'https://api.seatgeek.com/2/events';

  constructor(private readonly configService: ConfigService) {}

  async searchEvents(params: {
    zip_code?: string;
    radius_miles?: number;
    category?: string;
    keyword?: string;
    size?: number;
  }): Promise<SeatGeekEvent[]> {
    const clientId = this.configService.get<string>('SEATGEEK_CLIENT_ID');
    if (!clientId) return [];

    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const query = new URLSearchParams({ client_id: clientId, sort: 'datetime_utc.asc' });
    const clientSecret = this.configService.get<string>('SEATGEEK_CLIENT_SECRET');
    if (clientSecret) query.set('client_secret', clientSecret);

    if (params.zip_code) {
      query.set('postal_code', params.zip_code);
      query.set('range', `${params.radius_miles ?? 30}mi`);
    }
    if (params.category && TAXONOMY_MAP[params.category]) {
      query.set('taxonomies.name', TAXONOMY_MAP[params.category]);
    }
    if (params.keyword) query.set('q', params.keyword);
    query.set('per_page', String(params.size ?? 20));
    // Only future events
    query.set('datetime_utc.gte', new Date().toISOString().split('T')[0]);

    try {
      const res = await fetch(`${this.baseUrl}?${query.toString()}`);
      if (!res.ok) {
        this.logger.warn(`SeatGeek API returned ${res.status}`);
        return [];
      }
      const body = await res.json() as any;
      const raw: any[] = body?.events ?? [];

      const events: SeatGeekEvent[] = raw.map((e: any) => {
        const performer = e.performers?.[0];
        const image = performer?.image ?? null;
        const venue = e.venue;
        const localDt: string = e.datetime_local ?? '';
        const [datePart, timePart] = localDt.split('T');

        return {
          id: `sg_${e.id}`,
          title: e.title,
          event_date: datePart ?? '',
          start_time: timePart ? timePart.substring(0, 8) : null,
          venue_name: venue?.name ?? null,
          city: venue?.city ?? null,
          state: venue?.state ?? null,
          image_url: image,
          category: e.type ?? null,
          min_price: e.stats?.lowest_price ?? null,
          max_price: e.stats?.highest_price ?? null,
          seatgeek_url: e.url,
          source: 'seatgeek' as const,
        };
      });

      this.cache.set(cacheKey, { data: events, expiresAt: Date.now() + CACHE_TTL_MS });
      this.logger.log(`SeatGeek: ${events.length} events for ${JSON.stringify(params)}`);
      return events;
    } catch (err) {
      this.logger.error('SeatGeek API error', (err as Error).message);
      return [];
    }
  }
}
