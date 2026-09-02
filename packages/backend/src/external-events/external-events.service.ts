import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

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

@Injectable()
export class ExternalEventsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Public-facing query for the /events page. Aggregated external events
   * don't have a stored lat/lng, so unlike the Ticketmaster/SeatGeek
   * connectors this only supports an exact zip_code or city match rather
   * than a true radius search — a documented limitation, not a bug.
   */
  async getPublicEvents(params: {
    zip_code?: string;
    city?: string;
    category?: string;
    limit?: number;
  }): Promise<PublicExternalEvent[]> {
    const admin = this.supabaseService.getAdminClient();
    const today = new Date().toISOString().slice(0, 10);

    let query = admin
      .from('external_events')
      .select(
        'id, title, description, event_date, start_time, venue_name, city, state, zip_code, category, image_url, event_url, price_min, price_max, organizer',
      )
      .gte('event_date', today)
      .neq('dedupe_status', 'duplicate')
      .gte('confidence_score', MIN_CONFIDENCE)
      .is('expired_at', null)
      .order('event_date', { ascending: true })
      .limit(params.limit ?? 100);

    if (params.zip_code) query = query.eq('zip_code', params.zip_code);
    if (params.city) query = query.ilike('city', params.city);
    if (params.category) query = query.eq('category', params.category);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((row: Omit<PublicExternalEvent, 'source'>) => ({
      ...row,
      source: 'external' as const,
    }));
  }
}
