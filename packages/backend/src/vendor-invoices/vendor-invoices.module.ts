import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VendorInvoicesController } from './vendor-invoices.controller';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [VendorInvoicesController],
  providers: [VendorInvoicesService],
  exports: [VendorInvoicesService],
})
export class VendorInvoicesModule {}
