import { Module } from '@nestjs/common';
import { IrsLookupService } from './irs-lookup.service';
import { NonprofitController } from './nonprofit.controller';
import { NonprofitService } from './nonprofit.service';

@Module({
  controllers: [NonprofitController],
  providers: [NonprofitService, IrsLookupService],
  exports: [NonprofitService],
})
export class NonprofitModule {}
