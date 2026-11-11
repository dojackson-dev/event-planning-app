import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { VendorCatalogController } from './vendor-catalog.controller';
import { VendorCatalogService } from './vendor-catalog.service';

@Module({
  imports: [SupabaseModule],
  controllers: [VendorCatalogController],
  providers: [VendorCatalogService],
  exports: [VendorCatalogService],
})
export class VendorCatalogModule {}
