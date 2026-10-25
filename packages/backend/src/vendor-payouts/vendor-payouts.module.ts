import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { VendorPayoutsController } from './vendor-payouts.controller';
import { VendorPayoutsService } from './vendor-payouts.service';

@Module({
  imports: [SupabaseModule],
  controllers: [VendorPayoutsController],
  providers: [VendorPayoutsService],
})
export class VendorPayoutsModule {}
