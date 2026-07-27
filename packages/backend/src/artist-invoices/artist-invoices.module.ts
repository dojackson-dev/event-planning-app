import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArtistInvoicesController } from './artist-invoices.controller';
import { ArtistInvoicesService } from './artist-invoices.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [ArtistInvoicesController],
  providers: [ArtistInvoicesService],
  exports: [ArtistInvoicesService],
})
export class ArtistInvoicesModule {}
