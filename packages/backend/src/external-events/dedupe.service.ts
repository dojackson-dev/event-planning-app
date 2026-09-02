import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NormalizedExternalEvent } from './normalizer.service';

export type DedupeStatus = 'unique' | 'possible_duplicate' | 'duplicate';

export interface DedupeResult {
  status: DedupeStatus;
  duplicateOfExternalEventId: string | null;
}

/** Lowercases, strips punctuation/extra whitespace for fuzzy title comparison. */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Flags likely duplicate events by matching normalized title + event_date +
 * city against: (1) other external_events rows from a *different* source,
 * and (2) native promoter-created `public_events` rows.
 *
 * NOTE: Ticketmaster/SeatGeek/PredictHQ are live API proxies with no stored
 * rows in this database, so they can't be cross-referenced this way without
 * an extra live lookup per candidate event — left as a documented follow-up
 * rather than implemented as a slow/best-effort guess here.
 */
@Injectable()
export class DedupeService {
  private readonly logger = new Logger(DedupeService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async check(event: NormalizedExternalEvent): Promise<DedupeResult> {
    if (!event.event_date)
      return { status: 'unique', duplicateOfExternalEventId: null };
    const admin = this.supabaseService.getAdminClient();
    const normalized = normalizeTitle(event.title);

    try {
      const { data: candidates, error } = await admin
        .from('external_events')
        .select('id, title, source_id, first_seen_at')
        .eq('event_date', event.event_date)
        .neq('source_id', event.source_id)
        .order('first_seen_at', { ascending: true });
      if (error) throw error;

      const match = (candidates || []).find(
        (c: { title: string }) => normalizeTitle(c.title) === normalized,
      );
      if (match) {
        return {
          status: 'possible_duplicate',
          duplicateOfExternalEventId: match.id,
        };
      }

      if (event.city) {
        const { data: nativeMatches, error: nativeError } = await admin
          .from('public_events')
          .select('id, title')
          .eq('event_date', event.event_date)
          .ilike('city', event.city);
        if (nativeError) throw nativeError;
        const nativeMatch = (nativeMatches || []).find(
          (p: { title: string }) => normalizeTitle(p.title) === normalized,
        );
        if (nativeMatch) {
          return {
            status: 'possible_duplicate',
            duplicateOfExternalEventId: null,
          };
        }
      }

      return { status: 'unique', duplicateOfExternalEventId: null };
    } catch (err) {
      this.logger.warn(
        `Dedupe check failed for "${event.title}": ${err instanceof Error ? err.message : err}`,
      );
      return { status: 'unique', duplicateOfExternalEventId: null };
    }
  }
}
