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
    const res = await fetch(source.endpoint_url, {
      headers: { Accept: 'application/json', ...(config.headers || {}) },
    });
    if (!res.ok) {
      throw new Error(`REST source responded ${res.status} ${res.statusText}`);
    }
    const body = await res.json();
    const records = resolveRecordsArray(body, config.recordsPath);

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
}
