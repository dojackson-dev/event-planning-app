import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as zipcodes from 'zipcodes';

// Ticket Evolution (Victory Live) Exchange API v9 client.
// Docs: https://victorylive.atlassian.net/wiki/spaces/API/overview
// Every request must be signed with HMAC-SHA256 (X-Signature) using the
// brokerage's private API secret — see "Signing requests with X-Signature".
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface TicketEvolutionListResponse<T> {
  [key: string]: T[] | number | undefined;
  total_entries?: number;
}

interface TicketEvolutionRawEvent {
  id: number;
  name: string;
  url?: string | null;
  occurs_at: string | null;
  occurs_at_local: string | null;
  category?: { name?: string } | null;
  performances?: Array<{
    primary?: boolean;
    performer?: { name?: string } | null;
  }>;
  venue?: {
    name?: string;
    address?: { locality?: string; region?: string } | null;
  } | null;
}

// Fuller shape returned by Events / Show (GET /v9/events/:id) — adds fields
// not needed by the list view: notes, venue/configuration IDs (required by
// the seatmaps-client package), and photo sources (best-effort — TEvo's
// sandbox data rarely populates these; `meta.image` is officially deprecated
// and usually null, but we still check it in case a real event has one).
interface TicketEvolutionRawEventDetail extends TicketEvolutionRawEvent {
  notes?: string | null;
  venue?: {
    id?: number;
    name?: string;
    address?: { locality?: string; region?: string } | null;
  } | null;
  configuration?: { id?: number } | null;
  performances?: Array<{
    primary?: boolean;
    performer?: {
      name?: string;
      image?: { large?: string; url?: string } | null;
      meta?: { image?: string | null } | null;
    } | null;
  }>;
  meta?: { image?: string | null } | null;
}

// A single ticket group as returned by Listings (GET /v9/listings) — also the
// exact shape the seatmaps-client package expects for its `ticketGroups` prop.
interface TicketEvolutionRawListing {
  id: number;
  section?: string | null;
  row?: string | null;
  quantity?: number;
  retail_price?: number;
  format?: string | null;
}

// Normalized shape consumed by the public /events page — mirrors the other
// external-source event cards (Ticketmaster, aggregated external events).
export interface TicketEvolutionPublicEvent {
  id: string;
  title: string;
  event_date: string | null;
  start_time: string | null;
  venue_name: string | null;
  city: string | null;
  state: string | null;
  category: string | null;
  event_url: string | null;
  image_url: string | null;
  source: 'ticket_evolution';
}

@Injectable()
export class TicketEvolutionService {
  private readonly logger = new Logger(TicketEvolutionService.name);

  constructor(private readonly configService: ConfigService) {}

  private get baseUrl(): string {
    return (
      this.configService.get<string>('TICKET_EVOLUTION_BASE_URL') ??
      'https://api.sandbox.ticketevolution.com'
    );
  }

  private get apiToken(): string | undefined {
    return this.configService.get<string>('TICKET_EVOLUTION_API_TOKEN');
  }

  private get apiSecret(): string | undefined {
    return this.configService.get<string>('TICKET_EVOLUTION_API_SECRET');
  }

  // Our TEvo Hosted Checkout domain (e.g. https://checkout.eventecos.com), no trailing slash.
  private get checkoutBaseUrl(): string | undefined {
    return this.configService
      .get<string>('TICKET_EVOLUTION_CHECKOUT_BASE_URL')
      ?.replace(/\/$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.apiToken && this.apiSecret);
  }

  // Query keys must be sorted alphabetically or the API returns 401.
  private buildQueryString(query: RequestOptions['query'] = {}): string {
    return Object.entries(query)
      .filter(
        ([, value]) => value !== undefined && value !== null && value !== '',
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      )
      .join('&');
  }

  private sign(stringToSign: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret as string)
      .update(stringToSign)
      .digest('base64');
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException(
        'Ticket Evolution API credentials are not configured',
      );
    }

    const host = new URL(this.baseUrl).host;
    const queryString = this.buildQueryString(options.query);
    const bodyString =
      options.body !== undefined ? JSON.stringify(options.body) : undefined;

    // GET/DELETE sign the sorted query string; POST/PUT sign the raw body instead.
    const signedSuffix = bodyString !== undefined ? bodyString : queryString;
    const stringToSign = `${method} ${host}${path}?${signedSuffix}`;
    const signature = this.sign(stringToSign);

    const url = `${this.baseUrl}${path}${queryString ? `?${queryString}` : '?'}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Token': this.apiToken as string,
          'X-Signature': signature,
        },
        body: bodyString,
      });
    } catch (err) {
      this.logger.error(
        `Ticket Evolution ${method} ${path} request failed`,
        (err as Error).message,
      );
      throw new InternalServerErrorException(
        'Ticket Evolution API unreachable',
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.warn(
        `Ticket Evolution ${method} ${path} returned ${res.status}: ${text}`,
      );
      throw new InternalServerErrorException(
        `Ticket Evolution API error (${res.status})`,
      );
    }

    return (await res.json()) as T;
  }

  // Fallback image source — TEvo's API doesn't provide event/performer photos
  // (confirmed directly against production: Events/Show, Performers/Index,
  // Performers/Show, and Venues/Show all return only the deprecated, always-
  // null meta.image field). Wikipedia's free REST API often has a thumbnail
  // for well-known performers/venues, so we use it as a best-effort fallback
  // when TEvo itself returns nothing. Never throws — a missing/failed lookup
  // just means no photo, same as today.
  private async lookupWikipediaImage(query: string): Promise<string | null> {
    try {
      const title = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
      const res = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`,
        { headers: { Accept: 'application/json' } },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as {
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };
      return data.originalimage?.source ?? data.thumbnail?.source ?? null;
    } catch (err) {
      this.logger.warn(
        `Wikipedia image lookup failed for "${query}": ${(err as Error).message}`,
      );
      return null;
    }
  }

  searchEvents(params: {
    name?: string;
    occursAtGte?: string;
    occursAtLt?: string;
    venueId?: number;
    performerId?: number;
    page?: number;
    perPage?: number;
  }) {
    return this.request('GET', '/v9/events', {
      query: {
        name: params.name,
        'occurs_at.gte': params.occursAtGte,
        'occurs_at.lt': params.occursAtLt,
        venue_id: params.venueId,
        performer_id: params.performerId,
        page: params.page ?? 1,
        per_page: params.perPage ?? 25,
      },
    });
  }

  getEvent(id: number) {
    return this.request('GET', `/v9/events/${id}`);
  }

  // The Ticket Groups endpoint is deprecated by Ticket Evolution — use Listings
  // (listing id == ticket group id for cross-referencing other endpoints).
  // Note: unlike most other endpoints, Listings rejects page/per_page params
  // outright ("page is not allowed" / "per_page is not allowed") - it isn't
  // paginated the same way, so we don't pass them.
  getListings(eventId: number) {
    return this.request('GET', '/v9/listings', {
      query: { event_id: eventId },
    });
  }

  searchVenues(params: {
    name?: string;
    city?: string;
    state?: string;
    page?: number;
    perPage?: number;
  }) {
    return this.request('GET', '/v9/venues', {
      query: {
        name: params.name,
        city: params.city,
        state: params.state,
        page: params.page ?? 1,
        per_page: params.perPage ?? 25,
      },
    });
  }

  searchPerformers(params: { name?: string; page?: number; perPage?: number }) {
    return this.request('GET', '/v9/performers', {
      query: {
        name: params.name,
        page: params.page ?? 1,
        per_page: params.perPage ?? 25,
      },
    });
  }

  // Upcoming events, normalized for the public /events page grid — no pricing
  // (that requires a per-event Listings call). event_url links out to our
  // Hosted Checkout domain (TICKET_EVOLUTION_CHECKOUT_BASE_URL + raw event.url).
  async getPublicEvents(
    params: {
      name?: string;
      page?: number;
      perPage?: number;
      dateFrom?: string;
      dateTo?: string;
      zipCode?: string;
      radiusMiles?: number;
    } = {},
  ): Promise<TicketEvolutionPublicEvent[]> {
    const nowIso = new Date().toISOString();
    const gte =
      params.dateFrom && params.dateFrom > nowIso.slice(0, 10)
        ? `${params.dateFrom}T00:00:00Z`
        : nowIso;
    // occurs_at.lt is exclusive, so bump the upper bound to the start of the
    // day after date_to to keep that whole day inclusive.
    let lt: string | undefined;
    if (params.dateTo) {
      const next = new Date(`${params.dateTo}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      lt = next.toISOString();
    }
    // TEvo natively supports lat/lon/within radius search on Events / Index —
    // geocode the zip ourselves (same `zipcodes` package external-events uses)
    // rather than passing a zip straight through.
    const geo = params.zipCode ? zipcodes.lookup(params.zipCode) : undefined;
    const res = await this.request<
      TicketEvolutionListResponse<TicketEvolutionRawEvent>
    >('GET', '/v9/events', {
      query: {
        name: params.name,
        'occurs_at.gte': gte,
        'occurs_at.lt': lt,
        lat: geo?.latitude,
        lon: geo?.longitude,
        within: geo ? (params.radiusMiles ?? 30) : undefined,
        page: params.page ?? 1,
        per_page: params.perPage ?? 24,
      },
    });

    const events = (res.events as TicketEvolutionRawEvent[]) ?? [];
    const checkoutBaseUrl = this.checkoutBaseUrl;
    // TEvo itself has no event/performer photos (confirmed against production
    // — see lookupWikipediaImage) — look up each card's primary performer on
    // Wikipedia in parallel so the grid doesn't wait on them sequentially.
    return Promise.all(
      events.map(async (ev) => {
        const dateTime = ev.occurs_at_local ?? ev.occurs_at ?? null;
        const primaryPerformer = (ev.performances ?? []).find(
          (p) => p.primary,
        )?.performer?.name;
        const imageQuery = primaryPerformer || ev.name || ev.venue?.name;
        const image_url = imageQuery
          ? await this.lookupWikipediaImage(imageQuery)
          : null;
        return {
          id: String(ev.id),
          title: ev.name,
          event_date: dateTime ? dateTime.slice(0, 10) : null,
          start_time: dateTime ? dateTime.slice(11, 16) : null,
          venue_name: ev.venue?.name ?? null,
          city: ev.venue?.address?.locality ?? null,
          state: ev.venue?.address?.region ?? null,
          category: ev.category?.name ?? null,
          event_url:
            checkoutBaseUrl && ev.url ? `${checkoutBaseUrl}${ev.url}` : null,
          image_url,
          source: 'ticket_evolution' as const,
        };
      }),
    );
  }

  // Combined event + listings payload for our in-app TEvo event detail page
  // (photos, ticket options, and the interactive seatmap client, which needs
  // venue/configuration IDs plus the raw listings as "ticket groups").
  async getPublicEventDetail(id: number): Promise<{
    id: string;
    title: string;
    notes: string | null;
    event_date: string | null;
    start_time: string | null;
    venue_name: string | null;
    venue_id: number | null;
    configuration_id: number | null;
    city: string | null;
    state: string | null;
    category: string | null;
    images: string[];
    listings: Array<{
      id: number;
      section: string | null;
      row: string | null;
      quantity: number;
      retail_price: number;
      format: string | null;
    }>;
  }> {
    const ev = await this.request<TicketEvolutionRawEventDetail>(
      'GET',
      `/v9/events/${id}`,
    );
    const listingsRes = await this.request<
      TicketEvolutionListResponse<TicketEvolutionRawListing>
    >('GET', '/v9/listings', { query: { event_id: id } });

    const dateTime = ev.occurs_at_local ?? ev.occurs_at ?? null;
    let images = [
      ev.meta?.image,
      ...(ev.performances ?? []).map(
        (p) =>
          p.performer?.image?.large ??
          p.performer?.image?.url ??
          p.performer?.meta?.image,
      ),
    ].filter((url): url is string => Boolean(url));

    // TEvo itself returns no photos (see lookupWikipediaImage comment) — fall
    // back to a Wikipedia lookup on the primary performer (or the event name
    // if there's no performer/it's unnamed), then the venue as a last resort.
    if (images.length === 0) {
      const primaryPerformer = (ev.performances ?? []).find(
        (p) => p.primary,
      )?.performer?.name;
      const fallbackQuery = primaryPerformer || ev.name || ev.venue?.name;
      if (fallbackQuery) {
        const wikiImage = await this.lookupWikipediaImage(fallbackQuery);
        if (wikiImage) images = [wikiImage];
      }
    }

    const listings = ((listingsRes.ticket_groups as
      | TicketEvolutionRawListing[]
      | undefined) ?? []).map((lg) => ({
      id: lg.id,
      section: lg.section ?? null,
      row: lg.row ?? null,
      quantity: lg.quantity ?? 0,
      retail_price: lg.retail_price ?? 0,
      format: lg.format ?? null,
    }));

    return {
      id: String(ev.id),
      title: ev.name,
      notes: ev.notes ?? null,
      event_date: dateTime ? dateTime.slice(0, 10) : null,
      start_time: dateTime ? dateTime.slice(11, 16) : null,
      venue_name: ev.venue?.name ?? null,
      venue_id: ev.venue?.id ?? null,
      configuration_id: ev.configuration?.id ?? null,
      city: ev.venue?.address?.locality ?? null,
      state: ev.venue?.address?.region ?? null,
      category: ev.category?.name ?? null,
      images,
      listings,
    };
  }
}
