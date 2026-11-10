import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { OutreachService } from './outreach.service';

/** Public: the unsubscribe page in outreach emails posts here. The signed token proves the link came from us. */
@Controller('outreach')
export class OutreachPublicController {
  constructor(private readonly outreachService: OutreachService) {}

  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  async unsubscribe(@Body() body: { email?: unknown; token?: unknown }) {
    return this.outreachService.unsubscribe(body?.email, body?.token);
  }
}
