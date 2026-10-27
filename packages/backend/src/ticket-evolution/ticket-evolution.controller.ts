import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { TicketEvolutionService } from './ticket-evolution.service';

// The public feed is live for every origin. Set TICKET_EVOLUTION_PUBLIC_FEED=false
// to pull it back to dev/local origins only (kill switch).
const DEV_ORIGIN_HOSTS = [
  'dev.eventecos.com',
  'dev.dovenuesuite.com',
  'localhost',
];

function isDevOrigin(req: Request): boolean {
  const origin = req.headers.origin ?? req.headers.referer ?? '';
  return DEV_ORIGIN_HOSTS.some((host) => origin.includes(host));
}

@Controller('ticket-evolution')
export class TicketEvolutionController {
  constructor(
    private readonly service: TicketEvolutionService,
    private readonly config: ConfigService,
  ) {}

  /** True when the request may see the public TEvo feed. */
  private canServePublicFeed(req: Request): boolean {
    if (!this.service.isConfigured()) return false;
    return (
      this.config.get<string>('TICKET_EVOLUTION_PUBLIC_FEED') !== 'false' ||
      isDevOrigin(req)
    );
  }

  /**
   * GET /ticket-evolution/events
   * Proxies Ticket Evolution's Events search (signed server-side — the
   * brokerage secret never reaches the client).
   */
  @Get('events')
  searchEvents(
    @Query('name') name?: string,
    @Query('occurs_at_gte') occursAtGte?: string,
    @Query('occurs_at_lt') occursAtLt?: string,
    @Query('venue_id') venueId?: string,
    @Query('performer_id') performerId?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.service.searchEvents({
      name,
      occursAtGte,
      occursAtLt,
      venueId: venueId ? parseInt(venueId, 10) : undefined,
      performerId: performerId ? parseInt(performerId, 10) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get('events/:id')
  getEvent(@Param('id', ParseIntPipe) id: number) {
    return this.service.getEvent(id);
  }

  /**
   * GET /ticket-evolution/events/:id/listings
   * Listings replaces the deprecated Ticket Groups endpoint.
   */
  @Get('events/:id/listings')
  getListings(@Param('id', ParseIntPipe) id: number) {
    return this.service.getListings(id);
  }

  @Get('venues')
  searchVenues(
    @Query('name') name?: string,
    @Query('city') city?: string,
    @Query('state') state?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.service.searchVenues({
      name,
      city,
      state,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  @Get('performers')
  searchPerformers(
    @Query('name') name?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.service.searchPerformers({
      name,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
  }

  /**
   * GET /ticket-evolution/public-events
   * Normalized, unauthenticated feed for the public /events page. Returns an
   * empty list (instead of erroring) when TEvo credentials aren't configured,
   * or when the request isn't from a dev/local origin (sandbox-only feature).
   */
  @Get('public-events')
  getPublicEvents(
    @Req() req: Request,
    @Query('name') name?: string,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('zip_code') zipCode?: string,
    @Query('radius_miles') radiusMiles?: string,
  ) {
    if (!this.canServePublicFeed(req)) return [];
    return this.service.getPublicEvents({
      name,
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
      dateFrom,
      dateTo,
      zipCode,
      radiusMiles: radiusMiles ? parseInt(radiusMiles, 10) : undefined,
    });
  }

  /**
   * GET /ticket-evolution/public-events/:id
   * Normalized single-event detail (photos, venue/configuration IDs for the
   * seatmaps-client package, and ticket listings) for our in-app event detail
   * page. Same dev-origin/configured gating as the list feed above.
   */
  @Get('public-events/:id')
  getPublicEventDetail(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (!this.canServePublicFeed(req)) return null;
    return this.service.getPublicEventDetail(id);
  }
}
