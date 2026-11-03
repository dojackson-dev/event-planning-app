import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ListingPhotosController } from './listing-photos.controller';
import { ListingPhotosService } from './listing-photos.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ListingPhotosController],
  providers: [ListingPhotosService],
  exports: [ListingPhotosService],
})
export class ListingPhotosModule {}
