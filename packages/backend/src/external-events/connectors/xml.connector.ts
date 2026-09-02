import { Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
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
 * Generic XML feed connector. Parses the XML into a plain JS object (same
 * shape XML->JSON conventions as fast-xml-parser produce), then resolves
 * the array of event records via `connector_config.recordsPath` (e.g.
 * "events.event" or "rss.channel.item") and maps fields via `fieldMap`,
 * same as the REST/JSON connector.
 */
@Injectable()
export class XmlConnector implements EventConnector {
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  });

  async fetch(source: EventSourceRecord): Promise<RawExternalEvent[]> {
    const config = source.connector_config || {};
    const res = await fetch(source.endpoint_url, {
      headers: {
        Accept: 'application/xml, text/xml',
        ...(config.headers || {}),
      },
    });
    if (!res.ok) {
      throw new Error(`XML source responded ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    const body = this.parser.parse(text);
    const records = resolveRecordsArray(body, config.recordsPath);

    const fieldMap = config.fieldMap || {};
    return records.map((record) => {
      const dateVal = getByPath(record, fieldMap.eventDate);
      const { date, time } = splitDateTime(dateVal);
      return {
        externalId:
          toStringOrNull(getByPath(record, fieldMap.externalId)) ||
          toStringOrNull(getByPath(record, '@_id')) ||
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
