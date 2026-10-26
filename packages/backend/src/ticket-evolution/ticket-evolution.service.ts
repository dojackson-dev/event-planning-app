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
  retail_price_inclusive?: number;
  format?: string | null;
}

// Normalized shape consumed by the public /events page — mirrors the other
// external-source event cards (aggregated external events).
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
    return (
      this.configService.get<string>('TICKET_EVOLUTION_CHECKOUT_BASE_URL') ??
      'https://checkout.eventecos.com'
    ).replace(/\/$/, '');
  }

  // The feed is for a US audience; TICKET_EVOLUTION_COUNTRY_CODE=XX switches country and an empty value lifts the filter.
  private get countryCode(): string | undefined {
    const configured = this.configService.get<string>(
      'TICKET_EVOLUTION_COUNTRY_CODE',
    );
    return (configured ?? 'US').trim().toUpperCase() || undefined;
  }

  isConfigured(): boolean {
    return Boolean(this.apiToken && this.apiSecret);
  }

  /** Signed Orders/Show; used to verify unsigned order webhooks. */
  async getOrder(orderId: string): Promise<Record<string, unknown> | null> {
    const res = await this.request<Record<string, unknown> | null>(
      'GET',
      `/v9/orders/${encodeURIComponent(orderId)}`,
    );
    return res && typeof res === 'object' ? res : null;
  }

  /** Quantity is omitted so Hosted Checkout shows its own selector, which knows each listing's allowed splits. */
  private hostedCheckoutUrl(eventId: number, listingId: number): string | null {
    const base = this.checkoutBaseUrl;
    return base ? `${base}/checkout/payment/${eventId}/${listingId}` : null;
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
  private readonly imageCache = new Map<
    string,
    { value: string | null; expires: number }
  >();

  // Wikimedia rate-limits requests without a descriptive User-Agent (429s
  // under parallel load), which left most cards without a photo.
  private async lookupWikipediaImage(query: string): Promise<string | null> {
    const key = query.trim().toLowerCase();
    const cached = this.imageCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;

    const title = encodeURIComponent(query.trim().replace(/\s+/g, '_'));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`;
    const headers = {
      Accept: 'application/json',
      'User-Agent':
        'EventEcos/1.0 (https://www.eventecos.com; support@eventecos.com)',
    };
    try {
      let res = await fetch(url, { headers });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 500));
        res = await fetch(url, { headers });
      }
      // Only a definite miss is cached for long; throttling/errors retry soon.
      if (!res.ok) {
        this.imageCache.set(key, {
          value: null,
          expires: Date.now() + (res.status === 404 ? 24 : 0.05) * 3600_000,
        });
        return null;
      }
      const data = (await res.json()) as {
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };
      const value =
        data.originalimage?.source ?? data.thumbnail?.source ?? null;
      this.imageCache.set(key, { value, expires: Date.now() + 24 * 3600_000 });
      return value;
    } catch (err) {
      this.logger.warn(
        `Wikipedia image lookup failed for "${query}": ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async findImage(
    candidates: Array<string | null | undefined>,
  ): Promise<string | null> {
    for (const name of candidates) {
      if (!name) continue;
      const image = await this.lookupWikipediaImage(name);
      if (image) return image;
    }
    return null;
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
  // (that requires a per-event Listings call). Buying happens per listing on
  // the event detail page, so event_url is always null here.
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
        country_code: this.countryCode,
        'occurs_at.gte': gte,
        'occurs_at.lt': lt,
        lat: geo?.latitude,
        lon: geo?.longitude,
        within: geo ? (params.radiusMiles ?? 30) : undefined,
        page: params.page ?? 1,
        per_page: params.perPage ?? 24,
      },
    });

    const listed = (res.events as TicketEvolutionRawEvent[]) ?? [];
    const pinned = await this.getPinnedEvents(params);
    const events = [
      ...pinned,
      ...listed.filter((ev) => !pinned.some((p) => p.id === ev.id)),
    ];
    // TEvo itself has no event/performer photos (confirmed against production
    // — see lookupWikipediaImage); look them up in small batches to stay under
    // Wikimedia's rate limit.
    const mapEvent = async (ev: TicketEvolutionRawEvent) => {
      const dateTime = ev.occurs_at_local ?? ev.occurs_at ?? null;
      const primaryPerformer = (ev.performances ?? []).find((p) => p.primary)
        ?.performer?.name;
      const image_url = await this.findImage([
        primaryPerformer,
        ev.name,
        ev.venue?.name,
      ]);
      return {
        id: String(ev.id),
        title: ev.name,
        event_date: dateTime ? dateTime.slice(0, 10) : null,
        start_time: dateTime ? dateTime.slice(11, 16) : null,
        venue_name: ev.venue?.name ?? null,
        city: ev.venue?.address?.locality ?? null,
        state: ev.venue?.address?.region ?? null,
        category: ev.category?.name ?? null,
        event_url: null,
        image_url,
        source: 'ticket_evolution' as const,
      };
    };
    const results: Array<Awaited<ReturnType<typeof mapEvent>>> = [];
    for (let i = 0; i < events.length; i += 12) {
      results.push(
        ...(await Promise.all(events.slice(i, i + 12).map(mapEvent))),
      );
    }
    return results;
  }

  // Events shown first on the unfiltered first page, off by default. To show
  // Victory Live's "Test Purchases Only" events while they test, set
  // TICKET_EVOLUTION_PINNED_EVENT_IDS=982605,982604 (comma-separated IDs).
  private async getPinnedEvents(params: {
    name?: string;
    page?: number;
    dateFrom?: string;
    dateTo?: string;
    zipCode?: string;
  }): Promise<TicketEvolutionRawEvent[]> {
    if (
      (params.page ?? 1) !== 1 ||
      params.name ||
      params.dateFrom ||
      params.dateTo ||
      params.zipCode
    ) {
      return [];
    }
    const configured =
      this.configService.get<string>('TICKET_EVOLUTION_PINNED_EVENT_IDS') ?? '';
    const ids = configured
      .split(',')
      .map((id) => parseInt(id.trim(), 10))
      .filter((id) => Number.isInteger(id) && id > 0);
    const found = await Promise.all(
      ids.map((id) =>
        this.request<TicketEvolutionRawEvent>('GET', `/v9/events/${id}`).catch(
          () => null,
        ),
      ),
    );
    return found.filter((ev): ev is TicketEvolutionRawEvent => Boolean(ev?.id));
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
      checkout_url: string | null;
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
      const primaryPerformer = (ev.performances ?? []).find((p) => p.primary)
        ?.performer?.name;
      const fallbackQuery = primaryPerformer || ev.name || ev.venue?.name;
      if (fallbackQuery) {
        const wikiImage = await this.lookupWikipediaImage(fallbackQuery);
        if (wikiImage) images = [wikiImage];
      }
    }

    const listings = (
      (listingsRes.ticket_groups as TicketEvolutionRawListing[] | undefined) ??
      []
    ).map((lg) => ({
      id: lg.id,
      section: lg.section ?? null,
      row: lg.row ?? null,
      quantity: lg.quantity ?? 0,
      // All-in price (TEvo's recommendation; mandatory where requirements.inclusive_pricing is set).
      retail_price: lg.retail_price_inclusive ?? lg.retail_price ?? 0,
      format: lg.format ?? null,
      checkout_url: this.hostedCheckoutUrl(id, lg.id),
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
