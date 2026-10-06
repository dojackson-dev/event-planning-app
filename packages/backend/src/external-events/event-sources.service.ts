import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ConnectorFactory } from './connectors/connector-factory';
import { NormalizerService } from './normalizer.service';
import { DedupeService } from './dedupe.service';
import { QualityScoreService } from './quality-score.service';
import {
  CreateEventSourceDto,
  UpdateEventSourceDto,
} from './dto/event-source.dto';
import { EventSourceRecord } from './connectors/connector.types';

export interface SourceSyncResult {
  sourceId: string;
  fetched: number;
  upserted: number;
  errors: string[];
}

@Injectable()
export class EventSourcesService {
  private readonly logger = new Logger(EventSourcesService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly connectorFactory: ConnectorFactory,
    private readonly normalizer: NormalizerService,
    private readonly dedupeService: DedupeService,
    private readonly qualityScore: QualityScoreService,
  ) {}

  // ── registry CRUD ──────────────────────────────────────────────

  async listSources(status?: string): Promise<EventSourceRecord[]> {
    const admin = this.supabaseService.getAdminClient();
    let query = admin
      .from('event_sources')
      .select('*')
      .order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  async getSource(id: string): Promise<EventSourceRecord> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_sources')
      .select('*')
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Source not found');
    return data;
  }

  async createSource(
    dto: CreateEventSourceDto,
    createdBy?: string,
  ): Promise<EventSourceRecord> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_sources')
      .insert({
        name: dto.name,
        city: dto.city || null,
        state: dto.state || null,
        source_type: dto.source_type,
        endpoint_url: dto.endpoint_url,
        sync_frequency_hours: dto.sync_frequency_hours ?? 24,
        attribution_required: dto.attribution_required ?? false,
        attribution_text: dto.attribution_text || null,
        connector_config: dto.connector_config || {},
        notes: dto.notes || null,
        created_by: createdBy || null,
        status: 'discovered',
        active: false,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateSource(
    id: string,
    dto: UpdateEventSourceDto,
  ): Promise<EventSourceRecord> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_sources')
      .update({ ...dto, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException('Source not found');
    return data;
  }

  /**
   * Advances the approval workflow: discovered -> review_terms -> approved -> active.
   * `active` (the scheduler flag) is only turned on once status reaches 'active'.
   */
  async transitionStatus(
    id: string,
    status: 'review_terms' | 'approved' | 'active' | 'rejected' | 'paused',
  ): Promise<EventSourceRecord> {
    return this.updateSource(id, { status, active: status === 'active' });
  }

  async deleteSource(id: string): Promise<void> {
    const admin = this.supabaseService.getAdminClient();
    const { error } = await admin.from('event_sources').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }

  // ── sync orchestration ──────────────────────────────────────────

  async syncSource(sourceId: string): Promise<SourceSyncResult> {
    const source = await this.getSource(sourceId);
    const result: SourceSyncResult = {
      sourceId,
      fetched: 0,
      upserted: 0,
      errors: [],
    };
    const admin = this.supabaseService.getAdminClient();

    try {
      const connector = this.connectorFactory.getConnector(source.source_type);
      const rawEvents = await connector.fetch(source);
      result.fetched = rawEvents.length;

      for (const raw of rawEvents) {
        try {
          const normalized = this.normalizer.normalize(source, raw);
          if (!normalized) continue;

          const dedupe = await this.dedupeService.check(normalized);
          const confidence = this.qualityScore.score(normalized, dedupe.status);

          const { error } = await admin.from('external_events').upsert(
            {
              ...normalized,
              confidence_score: confidence,
              dedupe_status: dedupe.status,
              duplicate_of_external_event_id: dedupe.duplicateOfExternalEventId,
              last_seen_at: new Date().toISOString(),
              expired_at:
                normalized.event_date &&
                normalized.event_date < new Date().toISOString().slice(0, 10)
                  ? new Date().toISOString()
                  : null,
            },
            { onConflict: 'source_id,external_id' },
          );
          if (error) throw error;
          result.upserted += 1;
        } catch (eventErr) {
          result.errors.push(
            `event "${raw.title}": ${eventErr instanceof Error ? eventErr.message : eventErr}`,
          );
        }
      }

      await admin
        .from('event_sources')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: result.errors.length
            ? 'completed_with_errors'
            : 'success',
          last_sync_error: result.errors.length
            ? result.errors.slice(0, 5).join('; ')
            : null,
        })
        .eq('id', sourceId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(message);
      await admin
        .from('event_sources')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'failed',
          last_sync_error: message,
        })
        .eq('id', sourceId);
      this.logger.error(
        `Sync failed for source ${sourceId} (${source.name}): ${message}`,
      );
    }

    return result;
  }

  /** Returns sources due for a scheduled sync (active + status=active + past their frequency window). */
  async getDueSources(): Promise<EventSourceRecord[]> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('event_sources')
      .select('*')
      .eq('active', true)
      .eq('status', 'active');
    if (error) throw new Error(error.message);

    const now = Date.now();
    return (data || []).filter((source: EventSourceRecord) => {
      if (!source.last_sync_at) return true;
      const dueAt =
        new Date(source.last_sync_at).getTime() +
        source.sync_frequency_hours * 3600_000;
      return now >= dueAt;
    });
  }
}
