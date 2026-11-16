import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { StaffPayController } from './staff-pay.controller';
import { StaffPayService } from './staff-pay.service';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [StaffPayController],
  providers: [StaffPayService],
  exports: [StaffPayService],
})
export class StaffPayModule {}
