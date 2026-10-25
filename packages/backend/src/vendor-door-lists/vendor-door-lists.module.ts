import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { VendorDoorListsController } from './vendor-door-lists.controller';
import { VendorDoorListsService } from './vendor-door-lists.service';

@Module({
  imports: [SupabaseModule],
  controllers: [VendorDoorListsController],
  providers: [VendorDoorListsService],
})
export class VendorDoorListsModule {}
