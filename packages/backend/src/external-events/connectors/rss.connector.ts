import { Injectable } from '@nestjs/common';
import Parser from 'rss-parser';
import {
  EventConnector,
  EventSourceRecord,
  RawExternalEvent,
} from './connector.types';
import { splitDateTime, toStringOrNull } from './path-utils';

type RssItem = {
  guid?: string;
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  pubDate?: string;
  isoDate?: string;
  categories?: string[];
  enclosure?: { url?: string };
  [key: string]: unknown;
};

/**
 * RSS/Atom feed connector. Most tourism-board / news-calendar "events RSS"
 * feeds only expose title/link/description/pubDate — richer fields (venue,
 * city, price) are usually embedded in the description text and can't be
 * reliably parsed generically, so those are left null for a human to fill
 * in during review, or handled by a future per-source description-scraper.
 */
@Injectable()
export class RssConnector implements EventConnector {
  private readonly parser = new Parser<Record<string, unknown>, RssItem>();

  async fetch(source: EventSourceRecord): Promise<RawExternalEvent[]> {
    const feed = await this.parser.parseURL(source.endpoint_url);
    const items = feed.items || [];

    return items.map((item) => {
      const { date, time } = splitDateTime(item.isoDate || item.pubDate);
      return {
        externalId:
          toStringOrNull(item.guid) || toStringOrNull(item.link) || '',
        title: toStringOrNull(item.title) || 'Untitled Event',
        description: toStringOrNull(item.contentSnippet || item.content),
        eventDate: date,
        startTime: time,
        endTime: null,
        venueName: null,
        address: null,
        city: source.city,
        state: source.state,
        zipCode: null,
        category:
          (Array.isArray(item.categories) && item.categories[0]) ||
          source.connector_config?.defaultCategory ||
          null,
        imageUrl: toStringOrNull(item.enclosure?.url),
        eventUrl: toStringOrNull(item.link),
        priceMin: null,
        priceMax: null,
        organizer: toStringOrNull(feed.title),
        raw: item,
      };
    });
  }
}
