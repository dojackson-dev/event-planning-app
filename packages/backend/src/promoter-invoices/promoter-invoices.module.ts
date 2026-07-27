import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PromoterInvoicesController } from './promoter-invoices.controller';
import { PromoterInvoicesService } from './promoter-invoices.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [PromoterInvoicesController],
  providers: [PromoterInvoicesService],
  exports: [PromoterInvoicesService],
})
export class PromoterInvoicesModule {}
