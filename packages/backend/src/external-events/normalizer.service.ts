import { Injectable } from '@nestjs/common';
import {
  EventSourceRecord,
  RawExternalEvent,
} from './connectors/connector.types';

export interface NormalizedExternalEvent {
  source_id: string;
  external_id: string;
  title: string;
  description: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  category: string;
  image_url: string | null;
  event_url: string | null;
  price_min: number | null;
  price_max: number | null;
  organizer: string | null;
  raw_data: unknown;
}

const DEFAULT_CATEGORY = 'Other';

@Injectable()
export class NormalizerService {
  normalize(
    source: EventSourceRecord,
    raw: RawExternalEvent,
  ): NormalizedExternalEvent | null {
    const externalId = raw.externalId?.trim();
    const title = raw.title?.trim();
    if (!externalId || !title) return null; // can't dedupe or display without these

    let priceMin = raw.priceMin ?? null;
    let priceMax = raw.priceMax ?? null;
    if (priceMin !== null && priceMax !== null && priceMin > priceMax) {
      [priceMin, priceMax] = [priceMax, priceMin];
    }

    return {
      source_id: source.id,
      external_id: externalId,
      title,
      description: raw.description?.trim() || null,
      event_date: raw.eventDate || null,
      start_time: raw.startTime || null,
      end_time: raw.endTime || null,
      venue_name: raw.venueName?.trim() || null,
      address: raw.address?.trim() || null,
      city: raw.city?.trim() || source.city,
      state: raw.state?.trim() || source.state,
      zip_code: raw.zipCode?.trim() || null,
      category: raw.category?.trim() || DEFAULT_CATEGORY,
      image_url: raw.imageUrl || null,
      event_url: raw.eventUrl || null,
      price_min: priceMin,
      price_max: priceMax,
      organizer: raw.organizer?.trim() || null,
      raw_data: raw.raw ?? null,
    };
  }
}
