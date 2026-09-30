import { Controller, Get, Query } from '@nestjs/common';
import { PredictHQService } from './predicthq.service';

@Controller('predicthq')
export class PredictHQController {
  constructor(private readonly service: PredictHQService) {}

  /**
   * GET /predicthq/events
   * Proxies PredictHQ Events API — results cached 5 min.
   * Zip code is geocoded internally via zippopotam.us to satisfy PredictHQ's lat/lng requirement.
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
