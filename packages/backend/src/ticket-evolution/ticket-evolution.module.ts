import { Module } from '@nestjs/common';
import { TicketEvolutionService } from './ticket-evolution.service';
import { TicketEvolutionController } from './ticket-evolution.controller';
import { TicketEvolutionWebhookController } from './ticket-evolution-webhook.controller';
import { TicketOrdersService } from './ticket-orders.service';

@Module({
  controllers: [TicketEvolutionController, TicketEvolutionWebhookController],
  providers: [TicketEvolutionService, TicketOrdersService],
  exports: [TicketEvolutionService],
})
export class TicketEvolutionModule {}
