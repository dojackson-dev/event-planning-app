import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { MailModule } from '../mail/mail.module';
import { InvoicePaymentsController } from './invoice-payments.controller';
import { InvoicePaymentsService } from './invoice-payments.service';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule, MailModule],
  controllers: [InvoicePaymentsController],
  providers: [InvoicePaymentsService],
})
export class InvoicePaymentsModule {}
