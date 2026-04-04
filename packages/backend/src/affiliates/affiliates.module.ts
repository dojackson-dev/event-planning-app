import { Module } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesController } from './affiliates.controller';
import { AffiliateGuard } from './guards/affiliate.guard';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AffiliatesController],
  providers: [AffiliatesService, AffiliateGuard],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
