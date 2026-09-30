import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

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
  occurs_at: string | null;
  occurs_at_local: string | null;
  category?: { name?: string } | null;
  venue?: {
    name?: string;
    address?: { locality?: string; region?: string } | null;
  } | null;
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
  getListings(
    eventId: number,
    params: { page?: number; perPage?: number } = {},
  ) {
    return this.request('GET', '/v9/listings', {
      query: {
        event_id: eventId,
        page: params.page ?? 1,
        per_page: params.perPage ?? 25,
      },
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
  // (that requires a per-event Listings call) and no event_url yet since the
  // TEvo Hosted Checkout domain isn't live.
  async getPublicEvents(
    params: {
      name?: string;
      page?: number;
      perPage?: number;
      dateFrom?: string;
      dateTo?: string;
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
    const res = await this.request<
      TicketEvolutionListResponse<TicketEvolutionRawEvent>
    >('GET', '/v9/events', {
      query: {
        name: params.name,
        'occurs_at.gte': gte,
        'occurs_at.lt': lt,
        page: params.page ?? 1,
        per_page: params.perPage ?? 24,
      },
    });

    const events = (res.events as TicketEvolutionRawEvent[]) ?? [];
    return events.map((ev) => {
      const dateTime = ev.occurs_at_local ?? ev.occurs_at ?? null;
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
        source: 'ticket_evolution',
      };
    });
  }
}
