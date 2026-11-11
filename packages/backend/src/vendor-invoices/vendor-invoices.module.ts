import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VendorInvoicesController } from './vendor-invoices.controller';
import { VendorInvoicesService } from './vendor-invoices.service';
import { VendorEstimatesController } from './vendor-estimates.controller';
import { VendorEstimatesService } from './vendor-estimates.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [VendorInvoicesController, VendorEstimatesController],
  providers: [VendorInvoicesService, VendorEstimatesService],
  exports: [VendorInvoicesService],
})
export class VendorInvoicesModule {}
