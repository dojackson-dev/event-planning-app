import { Module } from '@nestjs/common';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
