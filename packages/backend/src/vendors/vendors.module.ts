import { Module } from '@nestjs/common';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { MailModule } from '../mail/mail.module';
import { ListingPhotosModule } from '../listing-photos/listing-photos.module';

@Module({
  imports: [SupabaseModule, MessagingModule, MailModule, ListingPhotosModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
