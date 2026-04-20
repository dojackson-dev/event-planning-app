import { Module, forwardRef } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { VendorInvoicesModule } from '../vendor-invoices/vendor-invoices.module';
import { ArtistInvoicesModule } from '../artist-invoices/artist-invoices.module';
import { PromoterInvoicesModule } from '../promoter-invoices/promoter-invoices.module';
import { PromoterEventsModule } from '../promoter-events/promoter-events.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [
    SupabaseModule,
    VendorInvoicesModule,
    ArtistInvoicesModule,
    PromoterInvoicesModule,
    PromoterEventsModule,
    forwardRef(() => AffiliatesModule),
    MessagingModule,
  ],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
