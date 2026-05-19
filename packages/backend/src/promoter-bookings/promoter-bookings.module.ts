import { Module } from '@nestjs/common';
import { PromoterBookingsController } from './promoter-bookings.controller';
import { PromoterBookingsService } from './promoter-bookings.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [PromoterBookingsController],
  providers: [PromoterBookingsService],
  exports: [PromoterBookingsService],
})
export class PromoterBookingsModule {}
