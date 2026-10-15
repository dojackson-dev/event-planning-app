import {
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  TicketOrdersService,
  type TicketOrderEnvironment,
  type TicketOrderWebhookPayload,
} from './ticket-orders.service';

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Ticket Evolution order webhooks. TEvo does not sign payloads, so the URL
 * carries a secret (TICKET_EVOLUTION_WEBHOOK_SECRET) and production orders are
 * re-fetched from the TEvo API before being stored.
 *
 *   POST /ticket-evolution/webhooks/:secret/production
 *   POST /ticket-evolution/webhooks/:secret/sandbox
 */
@Controller('ticket-evolution/webhooks')
export class TicketEvolutionWebhookController {
  constructor(
    private readonly orders: TicketOrdersService,
    private readonly config: ConfigService,
  ) {}

  @Post(':secret/:environment')
  @HttpCode(200)
  async receive(
    @Param('secret') secret: string,
    @Param('environment') environment: string,
    @Body() payload: TicketOrderWebhookPayload,
  ) {
    const expected = this.config.get<string>('TICKET_EVOLUTION_WEBHOOK_SECRET');
    if (!expected || !safeEqual(secret, expected)) {
      throw new NotFoundException();
    }
    if (environment !== 'production' && environment !== 'sandbox') {
      throw new NotFoundException();
    }
    return this.orders.handleWebhook(
      environment as TicketOrderEnvironment,
      payload ?? {},
    );
  }
}
