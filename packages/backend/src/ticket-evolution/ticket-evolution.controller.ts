import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { TicketEvolutionService } from './ticket-evolution.service';

@Controller('ticket-evolution')
export class TicketEvolutionController {
  constructor(private readonly service: TicketEvolutionService) {}

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
  getListings(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    return this.service.getListings(id, {
      page: page ? parseInt(page, 10) : undefined,
      perPage: perPage ? parseInt(perPage, 10) : undefined,
    });
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
}
