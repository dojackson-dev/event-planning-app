import { Controller, Get, Query } from '@nestjs/common';
import { SeatGeekService } from './seatgeek.service';

@Controller('seatgeek')
export class SeatGeekController {
  constructor(private readonly service: SeatGeekService) {}

  /**
   * GET /seatgeek/events
   * Proxies SeatGeek API — results cached 5 min to protect quota.
   * Source URL always included so clients link back to SeatGeek.
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
