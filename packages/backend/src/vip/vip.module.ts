import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { VipController } from './vip.controller';
import { VipService } from './vip.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
