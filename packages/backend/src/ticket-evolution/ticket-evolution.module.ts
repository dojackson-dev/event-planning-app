import { Module } from '@nestjs/common';
import { TicketEvolutionService } from './ticket-evolution.service';
import { TicketEvolutionController } from './ticket-evolution.controller';

@Module({
  controllers: [TicketEvolutionController],
  providers: [TicketEvolutionService],
  exports: [TicketEvolutionService],
})
export class TicketEvolutionModule {}
