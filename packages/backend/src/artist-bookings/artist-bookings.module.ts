import { Module } from '@nestjs/common';
import { ArtistBookingsController } from './artist-bookings.controller';
import { ArtistBookingsService } from './artist-bookings.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [ArtistBookingsController],
  providers: [ArtistBookingsService],
  exports: [ArtistBookingsService],
})
export class ArtistBookingsModule {}
