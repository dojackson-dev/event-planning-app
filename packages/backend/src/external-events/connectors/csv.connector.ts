import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import {
  EventConnector,
  EventSourceRecord,
  RawExternalEvent,
} from './connector.types';
import {
  getByPath,
  toNumberOrNull,
  toStringOrNull,
  splitDateTime,
} from './path-utils';

/**
 * Partner CSV feed connector. Fetches `endpoint_url` (a CSV file over
 * HTTP/HTTPS), parses it with the header row as column names, and maps
 * fields via `connector_config.fieldMap` (canonical field -> CSV column
 * header, e.g. { title: "Event Name", eventDate: "Date" }).
 */
@Injectable()
export class CsvConnector implements EventConnector {
  async fetch(source: EventSourceRecord): Promise<RawExternalEvent[]> {
    const config = source.connector_config || {};
    const res = await fetch(source.endpoint_url, {
      headers: { Accept: 'text/csv', ...(config.headers || {}) },
    });
    if (!res.ok) {
      throw new Error(`CSV source responded ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    const records: Record<string, unknown>[] = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: config.delimiter || ',',
    });

    const fieldMap = config.fieldMap || {};
    return records.map((record, index) => {
      const dateVal = getByPath(record, fieldMap.eventDate);
      const { date, time } = splitDateTime(dateVal);
      return {
        externalId:
          toStringOrNull(getByPath(record, fieldMap.externalId)) ||
          `${source.id}-row-${index}`,
        title:
          toStringOrNull(getByPath(record, fieldMap.title)) || 'Untitled Event',
        description: toStringOrNull(getByPath(record, fieldMap.description)),
        eventDate: date,
        startTime:
          toStringOrNull(getByPath(record, fieldMap.startTime)) || time,
        endTime: toStringOrNull(getByPath(record, fieldMap.endTime)),
        venueName: toStringOrNull(getByPath(record, fieldMap.venueName)),
        address: toStringOrNull(getByPath(record, fieldMap.address)),
        city: toStringOrNull(getByPath(record, fieldMap.city)) || source.city,
        state:
          toStringOrNull(getByPath(record, fieldMap.state)) || source.state,
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
