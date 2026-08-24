import { Module } from '@nestjs/common';
import { TicketmasterService } from './ticketmaster.service';
import { TicketmasterController } from './ticketmaster.controller';

@Module({
  controllers: [TicketmasterController],
  providers: [TicketmasterService],
  exports: [TicketmasterService],
})
export class TicketmasterModule {}
