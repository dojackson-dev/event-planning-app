import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InvoicesSupabaseController } from './invoices-supabase.controller';
import { InvoicesService } from './invoices-supabase.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule, MailModule],
  controllers: [InvoicesSupabaseController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
