import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PromoterEventsController } from './promoter-events.controller';
import { PromoterEventsService } from './promoter-events.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule, ConfigModule],
  controllers: [PromoterEventsController],
  providers: [PromoterEventsService],
  exports: [PromoterEventsService],
})
export class PromoterEventsModule {}
