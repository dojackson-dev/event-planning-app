import { Controller, Get, Query } from '@nestjs/common';
import { TicketmasterService } from './ticketmaster.service';

@Controller('ticketmaster')
export class TicketmasterController {
  constructor(private readonly service: TicketmasterService) {}

  /**
   * GET /ticketmaster/events
   * Proxies Ticketmaster Discovery API — results are cached 5 min to protect quota.
   * Source URL is always included so clients can link back to Ticketmaster.
   */
  @Get('events')
  searchEvents(
    @Query('zip_code') zipCode?: string,
    @Query('radius_miles') radiusMiles?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('size') size?: string,
  ) {
    return this.service.searchEvents({
      zip_code: zipCode,
      radius_miles: radiusMiles ? parseInt(radiusMiles, 10) : undefined,
      category,
      keyword,
      size: size ? parseInt(size, 10) : 20,
    });
  }
}
