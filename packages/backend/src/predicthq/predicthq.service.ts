import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PredictHQEvent {
  id: string;
  title: string;
  event_date: string;
  start_time: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  image_url: null; // PredictHQ does not provide images
  category: string | null;
  min_price: null; // PredictHQ does not provide pricing
  max_price: null;
  predicthq_url: string;
  phq_rank: number | null;
  source: 'predicthq';
}

interface CacheEntry {
  data: PredictHQEvent[];
  expiresAt: number;
}

const CATEGORY_MAP: Record<string, string> = {
  Music: 'concerts',
  Sports: 'sports',
  'Arts & Theater': 'performing-arts',
  Comedy: 'performing-arts',
  Festival: 'festivals',
  Conference: 'conferences,expos',
};

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class PredictHQService {
  private readonly logger = new Logger(PredictHQService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly zipCache = new Map<string, { lat: number; lng: number }>();
  private readonly baseUrl = 'https://api.predicthq.com/v1/events/';

  constructor(private readonly configService: ConfigService) {}

  private async zipToLatLng(zip: string): Promise<{ lat: number; lng: number } | null> {
    const cached = this.zipCache.get(zip);
    if (cached) return cached;
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
      if (!res.ok) return null;
      const body = await res.json() as any;
      const place = body?.places?.[0];
      if (!place) return null;
      const coords = { lat: parseFloat(place.latitude), lng: parseFloat(place.longitude) };
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
  }): Promise<PredictHQEvent[]> {
    const token = this.configService.get<string>('PREDICTHQ_API_TOKEN');
    if (!token) return [];

    const cacheKey = JSON.stringify(params);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const query = new URLSearchParams({
      sort: 'rank',
      limit: String(params.size ?? 20),
      // Only future events
      'start.gte': new Date().toISOString().split('T')[0],
    });

    if (params.zip_code) {
      const coords = await this.zipToLatLng(params.zip_code);
      if (coords) {
        const radius = params.radius_miles ?? 30;
        query.set('within', `${radius}mi@${coords.lat},${coords.lng}`);
      }
    }

    if (params.category && CATEGORY_MAP[params.category]) {
      query.set('category', CATEGORY_MAP[params.category]);
    } else {
      // Default: show ticketed/attended events only
      query.set('category', 'concerts,festivals,sports,performing-arts,conferences,expos,community');
    }

    if (params.keyword) query.set('q', params.keyword);

    try {
      const res = await fetch(`${this.baseUrl}?${query.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      });

      if (!res.ok) {
        this.logger.warn(`PredictHQ API returned ${res.status}`);
        return [];
      }

      const body = await res.json() as any;
      const raw: any[] = body?.results ?? [];

      const events: PredictHQEvent[] = raw
        .filter((e: any) => e.start) // skip events without a date
        .map((e: any) => {
          const startLocal: string = e.start ?? '';
          const [datePart, timePart] = startLocal.split('T');
          const venue = e.entities?.find((en: any) => en.type === 'venue');
          const cityEntity = e.entities?.find((en: any) => en.type === 'locality');
          const stateEntity = e.entities?.find((en: any) => en.type === 'region');

          return {
            id: `phq_${e.id}`,
            title: e.title,
            event_date: datePart ?? '',
            start_time: timePart ? timePart.substring(0, 8) : null,
            venue_name: venue?.name ?? null,
            city: cityEntity?.name ?? null,
            state: stateEntity?.name ?? null,
            image_url: null,
            category: e.category ?? null,
            min_price: null,
            max_price: null,
            phq_rank: e.rank ?? null,
            predicthq_url: `https://www.predicthq.com/intelligence/events/${e.id}`,
            source: 'predicthq' as const,
          };
        });

      this.cache.set(cacheKey, { data: events, expiresAt: Date.now() + CACHE_TTL_MS });
      this.logger.log(`PredictHQ: ${events.length} events for ${JSON.stringify(params)}`);
      return events;
    } catch (err) {
      this.logger.error('PredictHQ API error', (err as Error).message);
      return [];
    }
  }
}
