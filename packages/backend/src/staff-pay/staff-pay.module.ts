import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { StaffPayController } from './staff-pay.controller';
import { StaffPayService } from './staff-pay.service';
import { StaffPayoutsService } from './staff-payouts.service';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [StaffPayController],
  providers: [StaffPayService, StaffPayoutsService],
  exports: [StaffPayService, StaffPayoutsService],
})
export class StaffPayModule {}
