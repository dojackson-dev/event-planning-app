/**
 * Shared types for the external-events connector pipeline.
 *
 *   event_sources row (registry)
 *     -> EventConnector.fetch() returns RawExternalEvent[]
 *     -> NormalizerService maps + cleans into NormalizedExternalEvent
 *     -> DedupeService flags duplicates
 *     -> QualityScoreService assigns a confidence_score
 *     -> upserted into external_events (unique on source_id + external_id)
 */

export type EventSourceType = 'rest_json' | 'rss' | 'ics' | 'xml' | 'csv';

export type EventSourceStatus =
  | 'discovered'
  | 'review_terms'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'paused';

/** A row from the `event_sources` table. */
export interface EventSourceRecord {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  source_type: EventSourceType;
  endpoint_url: string;
  active: boolean;
  sync_frequency_hours: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  status: EventSourceStatus;
  terms_status: string;
  attribution_required: boolean;
  attribution_text: string | null;
  connector_config: EventSourceConnectorConfig;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Per-source configuration for how to map the source's raw shape onto our
 * canonical RawExternalEvent fields. Every connector reads a `fieldMap`
 * (dot-paths into a single record) except ICS, which is already a fixed
 * standard format.
 */
export interface EventSourceConnectorConfig {
  /** REST/XML only: dot-path to the array of event records in the response. */
  recordsPath?: string;
  /** REST/XML/CSV: maps canonical field name -> dot-path (or CSV column name). */
  fieldMap?: Partial<Record<keyof RawExternalEvent, string>>;
  /** REST only: extra HTTP headers required by the source (e.g. API key). */
  headers?: Record<string, string>;
  /** CSV only: delimiter override, defaults to ','. */
  delimiter?: string;
  /** Fallback category applied when the source doesn't provide one. */
  defaultCategory?: string;
}

/** Canonical shape every connector normalizes its output into. */
export interface RawExternalEvent {
  externalId: string;
  title: string;
  description?: string | null;
  eventDate?: string | null; // ISO date (YYYY-MM-DD)
  startTime?: string | null; // HH:MM[:SS]
  endTime?: string | null;
  venueName?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  category?: string | null;
  imageUrl?: string | null;
  eventUrl?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  organizer?: string | null;
  raw?: unknown;
}

export interface EventConnector {
  /** Fetches and coarsely parses events from a source's endpoint_url. */
  fetch(source: EventSourceRecord): Promise<RawExternalEvent[]>;
}
