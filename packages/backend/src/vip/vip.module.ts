import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VipController } from './vip.controller';
import { VipService } from './vip.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule, ConfigModule],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
