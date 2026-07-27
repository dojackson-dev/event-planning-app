import { Module } from '@nestjs/common';
import { PromoterController } from './promoter.controller';
import { PromoterService } from './promoter.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [PromoterController],
  providers: [PromoterService],
  exports: [PromoterService],
})
export class PromoterModule {}
