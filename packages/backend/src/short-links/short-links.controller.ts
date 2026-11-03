import { Controller, Get, Param } from '@nestjs/common';
import { ShortLinksService } from './short-links.service';

@Controller('short-links')
export class ShortLinksController {
  constructor(private readonly shortLinks: ShortLinksService) {}

  /** GET /short-links/:kind/:code — public. kind is b (vendor), a (artist), p (promoter) or v (venue). */
  @Get(':kind/:code')
  resolve(@Param('kind') kind: string, @Param('code') code: string) {
    return this.shortLinks.resolve(kind, code);
  }
}
