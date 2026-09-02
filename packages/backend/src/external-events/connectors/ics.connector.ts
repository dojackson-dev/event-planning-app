import { Injectable } from '@nestjs/common';
import * as ical from 'node-ical';
import {
  EventConnector,
  EventSourceRecord,
  RawExternalEvent,
} from './connector.types';
import { toStringOrNull } from './path-utils';

/**
 * ICS/iCalendar connector (university calendars, venue calendars, etc.).
 * Only VEVENT components are considered; VTIMEZONE/VALARM etc. are skipped.
 */
@Injectable()
export class IcsConnector implements EventConnector {
  async fetch(source: EventSourceRecord): Promise<RawExternalEvent[]> {
    const parsed = await ical.async.fromURL(source.endpoint_url);

    const events: RawExternalEvent[] = [];
    for (const component of Object.values(parsed)) {
      const comp = component as ical.VEvent & { [key: string]: unknown };
      if (comp.type !== 'VEVENT') continue;

      const start: Date | undefined =
        comp.start instanceof Date ? comp.start : undefined;
      const end: Date | undefined =
        comp.end instanceof Date ? comp.end : undefined;

      events.push({
        externalId: toStringOrNull(comp.uid) || '',
        title: toStringOrNull(comp.summary) || 'Untitled Event',
        description: toStringOrNull(comp.description),
        eventDate: start ? start.toISOString().slice(0, 10) : null,
        startTime: start ? start.toISOString().slice(11, 19) : null,
        endTime: end ? end.toISOString().slice(11, 19) : null,
        venueName: toStringOrNull(comp.location),
        address: toStringOrNull(comp.location),
        city: source.city,
        state: source.state,
        zipCode: null,
        category: source.connector_config?.defaultCategory || null,
        imageUrl: null,
        eventUrl: toStringOrNull(comp.url),
        priceMin: null,
        priceMax: null,
        organizer: toStringOrNull(
          comp.organizer as { val?: string } | string | undefined as string,
        ),
        raw: comp,
      });
    }
    return events;
  }
}
