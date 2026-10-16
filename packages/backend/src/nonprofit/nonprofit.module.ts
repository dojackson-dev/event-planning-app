import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { IrsLookupService } from './irs-lookup.service';
import { NonprofitController } from './nonprofit.controller';
import { NonprofitService } from './nonprofit.service';
import { SponsorshipCheckoutService } from './sponsorship-checkout.service';
import { SponsorshipService } from './sponsorship.service';

@Module({
  imports: [MailModule],
  controllers: [NonprofitController],
  providers: [
    NonprofitService,
    IrsLookupService,
    SponsorshipService,
    SponsorshipCheckoutService,
  ],
  exports: [NonprofitService, SponsorshipCheckoutService],
})
export class NonprofitModule {}
