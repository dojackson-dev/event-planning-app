import { Module, forwardRef } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { VendorInvoicesModule } from '../vendor-invoices/vendor-invoices.module';
import { AffiliatesModule } from '../affiliates/affiliates.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, VendorInvoicesModule, forwardRef(() => AffiliatesModule), MessagingModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
