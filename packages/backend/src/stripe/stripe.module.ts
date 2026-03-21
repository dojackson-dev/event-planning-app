import { Module } from '@nestjs/common';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { VendorInvoicesModule } from '../vendor-invoices/vendor-invoices.module';

@Module({
  imports: [SupabaseModule, VendorInvoicesModule],
  controllers: [StripeController],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
