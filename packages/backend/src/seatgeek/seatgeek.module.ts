import { Module } from '@nestjs/common';
import { SeatGeekService } from './seatgeek.service';
import { SeatGeekController } from './seatgeek.controller';

@Module({
  controllers: [SeatGeekController],
  providers: [SeatGeekService],
  exports: [SeatGeekService],
})
export class SeatGeekModule {}
