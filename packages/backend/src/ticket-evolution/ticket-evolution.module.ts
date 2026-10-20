import { Module } from '@nestjs/common';
import { TicketmasterModule } from '../ticketmaster/ticketmaster.module';
import { TicketEvolutionService } from './ticket-evolution.service';
import { TicketEvolutionController } from './ticket-evolution.controller';
import { TicketEvolutionWebhookController } from './ticket-evolution-webhook.controller';
import { TicketOrdersService } from './ticket-orders.service';

@Module({
  imports: [TicketmasterModule],
  controllers: [TicketEvolutionController, TicketEvolutionWebhookController],
  providers: [TicketEvolutionService, TicketOrdersService],
  exports: [TicketEvolutionService],
})
export class TicketEvolutionModule {}
