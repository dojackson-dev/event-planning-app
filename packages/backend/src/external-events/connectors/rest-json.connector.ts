import { Injectable, Logger } from '@nestjs/common';
import {
  EventConnector,
  EventSourceRecord,
  RawExternalEvent,
} from './connector.types';
import {
  getByPath,
  resolveRecordsArray,
  toNumberOrNull,
  toStringOrNull,
  splitDateTime,
} from './path-utils';

const MONTH_END_WINDOW_DAYS = 14;

/**
 * Providers like RapidAPI "Real-Time Events Search" take `date=month`, meaning only the rest of the current
 * calendar month. Near month-end that is a day or two, so the next month's events are missing until the new
 * month starts. In the last two weeks this returns the same query for `date=next_month`; otherwise null.
 */
export function nextMonthEndpoint(
  endpointUrl: string,
  now: Date = new Date(),
): string | null {
  if (!/([?&])date=month(&|$)/.test(endpointUrl)) return null;
  const daysInMonth = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0),
  ).getUTCDate();
  if (daysInMonth - now.getUTCDate() >= MONTH_END_WINDOW_DAYS) return null;
  return endpointUrl.replace(/([?&])date=month(&|$)/, '$1date=next_month$2');
}

/**
 * Generic REST/JSON API connector. Fetches `endpoint_url`, resolves the
 * array of event records via `connector_config.recordsPath` (e.g. "events"
 * or "_embedded.events"), then maps each record's fields using
 * `connector_config.fieldMap` (dot-paths into the record).
 */
@Injectable()
export class RestJsonConnector implements EventConnector {
  private readonly logger = new Logger(RestJsonConnector.name);

  async fetch(source: EventSourceRecord): Promise<RawExternalEvent[]> {
    const config = source.connector_config || {};
    const records = await this.fetchRecords(
      source.endpoint_url,
      config.headers,
      config.recordsPath,
    );

    const nextMonthUrl = nextMonthEndpoint(source.endpoint_url);
    if (nextMonthUrl) {
      try {
        const more = await this.fetchRecords(
          nextMonthUrl,
          config.headers,
          config.recordsPath,
        );
        const seen = new Set(
          records.map((r) =>
            toStringOrNull(getByPath(r, config.fieldMap?.externalId)),
          ),
        );
        for (const r of more) {
          const id = toStringOrNull(getByPath(r, config.fieldMap?.externalId));
          if (!id || !seen.has(id)) records.push(r);
        }
      } catch (err) {
        // The current month already succeeded; a failed extra window must not fail the whole sync.
        this.logger.warn(
          `Next-month window failed for ${source.name}: ${err instanceof Error ? err.message : err}`,
        );
      }
    }

    const fieldMap = config.fieldMap || {};
    return records.map((record) => {
      const dateVal = getByPath(record, fieldMap.eventDate);
      const { date, time } = splitDateTime(dateVal);
      return {
        externalId:
          toStringOrNull(getByPath(record, fieldMap.externalId)) ||
          toStringOrNull(getByPath(record, 'id')) ||
          '',
        title:
          toStringOrNull(getByPath(record, fieldMap.title)) || 'Untitled Event',
        description: toStringOrNull(getByPath(record, fieldMap.description)),
        eventDate: date,
        startTime:
          toStringOrNull(getByPath(record, fieldMap.startTime)) || time,
        endTime: toStringOrNull(getByPath(record, fieldMap.endTime)),
        venueName: toStringOrNull(getByPath(record, fieldMap.venueName)),
        address: toStringOrNull(getByPath(record, fieldMap.address)),
        city: toStringOrNull(getByPath(record, fieldMap.city)),
        state: toStringOrNull(getByPath(record, fieldMap.state)),
        zipCode: toStringOrNull(getByPath(record, fieldMap.zipCode)),
        category:
          toStringOrNull(getByPath(record, fieldMap.category)) ||
          config.defaultCategory ||
          null,
        imageUrl: toStringOrNull(getByPath(record, fieldMap.imageUrl)),
        eventUrl: toStringOrNull(getByPath(record, fieldMap.eventUrl)),
        priceMin: toNumberOrNull(getByPath(record, fieldMap.priceMin)),
        priceMax: toNumberOrNull(getByPath(record, fieldMap.priceMax)),
        organizer: toStringOrNull(getByPath(record, fieldMap.organizer)),
        raw: record,
      };
    });
  }

  private async fetchRecords(
    url: string,
    headers: Record<string, string> | undefined,
    recordsPath: string | undefined,
  ): Promise<any[]> {
    const res = await fetch(url, {
      headers: { Accept: 'application/json', ...(headers || {}) },
    });
    if (!res.ok) {
      throw new Error(`REST source responded ${res.status} ${res.statusText}`);
    }
    return resolveRecordsArray(await res.json(), recordsPath);
  }
}
