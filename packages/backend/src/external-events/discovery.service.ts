import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { EventSourceType } from './connectors/connector.types';
import { CreateDiscoveryCandidateDto } from './dto/discovery-candidate.dto';

export interface DiscoveryCandidateRecord {
  id: string;
  query: string | null;
  suggested_name: string | null;
  city: string | null;
  state: string | null;
  candidate_url: string;
  suggested_source_type: EventSourceType | null;
  status: 'new' | 'promoted' | 'dismissed';
  notes: string | null;
  discovered_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  promoted_to_source_id: string | null;
}

interface BraveWebResult {
  title: string;
  url: string;
  description?: string;
}

/** Guesses a connector type from a URL/snippet so a reviewer has a starting point — never guesses actual feed content. */
function guessSourceType(url: string): EventSourceType | null {
  const lower = url.toLowerCase();
  if (lower.endsWith('.ics') || lower.includes('/ical')) return 'ics';
  if (lower.includes('rss') || lower.includes('/feed')) return 'rss';
  if (lower.endsWith('.xml')) return 'xml';
  if (lower.endsWith('.csv')) return 'csv';
  if (lower.endsWith('.json') || lower.includes('/api/')) return 'rest_json';
  return null;
}

/**
 * Automated source discovery: searches the web for candidate event feeds
 * (e.g. "Atlanta events RSS") and queues results for human review rather
 * than publishing them directly (DISCOVERED -> REVIEW TERMS -> APPROVED).
 *
 * Requires a real search API key to actually search the internet — this
 * service will NOT fabricate or guess city feed URLs on its own. Without
 * BRAVE_SEARCH_API_KEY configured, `runDiscovery` is a documented no-op and
 * staff should use `addCandidate` to seed sources manually instead.
 *
 * Uses the Brave Search API (api.search.brave.com) rather than the old Bing
 * Web Search API v7, which Microsoft retired in August 2025.
 */
@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly supabaseService: SupabaseService,
  ) {}

  isSearchProviderConfigured(): boolean {
    return !!this.configService.get<string>('BRAVE_SEARCH_API_KEY');
  }

  async runDiscovery(
    queries: string[],
  ): Promise<{ ran: boolean; candidatesCreated: number; reason?: string }> {
    const apiKey = this.configService.get<string>('BRAVE_SEARCH_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'Automated source discovery skipped: BRAVE_SEARCH_API_KEY is not configured. ' +
          'Add candidates manually via POST /external-events/discovery-candidates instead.',
      );
      return {
        ran: false,
        candidatesCreated: 0,
        reason: 'BRAVE_SEARCH_API_KEY not configured',
      };
    }

    const admin = this.supabaseService.getAdminClient();
    let created = 0;

    for (const query of queries) {
      try {
        const res = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`,
          {
            headers: {
              Accept: 'application/json',
              'X-Subscription-Token': apiKey,
            },
          },
        );
        if (!res.ok) {
          this.logger.warn(
            `Brave search failed for "${query}": ${res.status} ${res.statusText}`,
          );
          continue;
        }
        const body = await res.json();
        const pages: BraveWebResult[] = body?.web?.results || [];

        for (const page of pages) {
          const { error } = await admin
            .from('event_source_discovery_candidates')
            .insert({
              query,
              suggested_name: page.title,
              candidate_url: page.url,
              suggested_source_type: guessSourceType(page.url),
              notes: page.description || null,
              status: 'new',
            });
          // Duplicate candidate_url inserts are expected across repeated runs; ignore those, log anything else.
          if (error && !/duplicate key/i.test(error.message)) {
            this.logger.warn(
              `Failed to save discovery candidate ${page.url}: ${error.message}`,
            );
            continue;
          }
          if (!error) created += 1;
        }
      } catch (err) {
        this.logger.warn(
          `Discovery query "${query}" failed: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    return { ran: true, candidatesCreated: created };
  }

  // ── candidate review queue ──────────────────────────────────────

  async listCandidates(status?: string): Promise<DiscoveryCandidateRecord[]> {
    const admin = this.supabaseService.getAdminClient();
    let query = admin
      .from('event_source_discovery_candidates')
      .select('*')
      .order('discovered_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async addCandidate(
    dto: CreateDiscoveryCandidateDto,
  ): Promise<DiscoveryCandidateRecord> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_source_discovery_candidates')
      .insert({
        candidate_url: dto.candidate_url,
        suggested_name: dto.suggested_name || null,
        city: dto.city || null,
        state: dto.state || null,
        suggested_source_type:
          dto.suggested_source_type || guessSourceType(dto.candidate_url),
        query: dto.query || null,
        notes: dto.notes || null,
        status: 'new',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async dismissCandidate(
    id: string,
    reviewedBy?: string,
  ): Promise<DiscoveryCandidateRecord> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_source_discovery_candidates')
      .update({
        status: 'dismissed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy || null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async markPromoted(
    id: string,
    promotedToSourceId: string,
    reviewedBy?: string,
  ): Promise<DiscoveryCandidateRecord> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_source_discovery_candidates')
      .update({
        status: 'promoted',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewedBy || null,
        promoted_to_source_id: promotedToSourceId,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
}
