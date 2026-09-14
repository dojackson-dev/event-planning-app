import { Injectable, Logger } from '@nestjs/common';
import * as zipcodes from 'zipcodes';
import { SupabaseService } from '../supabase/supabase.service';

function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface PublicExternalEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  start_time: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  category: string | null;
  image_url: string | null;
  event_url: string | null;
  price_min: number | null;
  price_max: number | null;
  organizer: string | null;
  source: 'external';
}

const MIN_CONFIDENCE = 0.3;

// external_events has no per-row timezone/offset column, so we can't know an
// event's exact local UTC offset. To avoid ever hiding an event that's still
// upcoming somewhere in the US, only treat a "today"-dated event as already
// over once it would be past even under the most generous interpretation —
// i.e. if its wall-clock start_time, read as UTC, plus the largest UTC
// offset used in the US (UTC-10, Hawaii), is still before the current
// instant. This under-filters (some already-started events in earlier
// zones may briefly remain visible) but never over-filters a real upcoming
// event.
const MAX_US_UTC_OFFSET_HOURS = 10;

function isDefinitelyPast(
  eventDate: string,
  startTime: string | null,
  nowMs: number,
): boolean {
  if (!startTime) return false;
  const naiveUtcMs = Date.parse(`${eventDate}T${startTime}Z`);
  if (Number.isNaN(naiveUtcMs)) return false;
  return naiveUtcMs + MAX_US_UTC_OFFSET_HOURS * 60 * 60 * 1000 < nowMs;
}

@Injectable()
export class ExternalEventsService {
  private readonly logger = new Logger(ExternalEventsService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Public-facing query for the /events page. Aggregated external events
   * don't have a stored lat/lng, so we geocode the search zip_code and each
   * candidate event's zip_code via the local `zipcodes` package (same
   * approach as promoter-events.service.ts's listPublicEvents) and filter
   * by haversine distance instead of requiring an exact zip_code match.
   */
  async getPublicEvents(params: {
    zip_code?: string;
    city?: string;
    category?: string;
    radius_miles?: number;
    limit?: number;
  }): Promise<PublicExternalEvent[]> {
    const admin = this.supabaseService.getAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    const resultLimit = params.limit ?? 100;

    const buildQuery = () => {
      let query = admin
        .from('external_events')
        .select(
          'id, title, description, event_date, start_time, venue_name, city, state, zip_code, category, image_url, event_url, price_min, price_max, organizer',
        )
        .gte('event_date', today)
        .neq('dedupe_status', 'duplicate')
        .gte('confidence_score', MIN_CONFIDENCE)
        .is('expired_at', null)
        .order('event_date', { ascending: true });
      if (params.city) query = query.ilike('city', params.city);
      if (params.category) query = query.eq('category', params.category);
      return query;
    };

    let data: Omit<PublicExternalEvent, 'source'>[];
    if (!params.zip_code) {
      const { data: rows, error } = await buildQuery().limit(resultLimit);
      if (error) throw new Error(error.message);
      data = rows || [];
    } else {
      // The radius match happens in-memory below, so we can't cap this query
      // with .limit() — but PostgREST silently caps any unpaginated query at
      // its default max-rows (commonly 1000), which would otherwise cut off
      // matching rows for the target zip once total upcoming events exceed
      // that cap. Page through with .range() to fetch everything instead.
      const pageSize = 1000;
      data = [];
      for (let offset = 0; ; offset += pageSize) {
        const { data: rows, error } = await buildQuery().range(
          offset,
          offset + pageSize - 1,
        );
        if (error) throw new Error(error.message);
        data.push(...(rows || []));
        if (!rows || rows.length < pageSize) break;
      }
    }

    const nowMs = Date.now();
    let events = data
      .filter((row) => !isDefinitelyPast(row.event_date, row.start_time, nowMs))
      .map((row) => ({
        ...row,
        source: 'external' as const,
      }));

    if (params.zip_code) {
      const radiusMiles = params.radius_miles ?? 30;
      const searchLoc = zipcodes.lookup(params.zip_code);
      if (searchLoc) {
        events = events.filter((event) => {
          if (!event.zip_code) return false;
          const eventLoc = zipcodes.lookup(event.zip_code);
          if (!eventLoc) return false;
          const dist = haversineDistanceMiles(
            searchLoc.latitude,
            searchLoc.longitude,
            eventLoc.latitude,
            eventLoc.longitude,
          );
          return dist <= radiusMiles;
        });
      } else {
        this.logger.warn(`Zip code lookup failed for: ${params.zip_code}`);
        events = [];
      }
    }

    return events.slice(0, resultLimit);
  }
}
