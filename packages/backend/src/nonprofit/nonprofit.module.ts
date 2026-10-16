import { Module } from '@nestjs/common';
import { IrsLookupService } from './irs-lookup.service';
import { NonprofitController } from './nonprofit.controller';
import { NonprofitService } from './nonprofit.service';
import { SponsorshipService } from './sponsorship.service';

@Module({
  controllers: [NonprofitController],
  providers: [NonprofitService, IrsLookupService, SponsorshipService],
  exports: [NonprofitService],
})
export class NonprofitModule {}
