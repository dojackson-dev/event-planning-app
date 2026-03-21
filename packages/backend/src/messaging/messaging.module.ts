import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service.js';
import { MessagingController } from './messaging.controller.js';
import { TwilioService } from './twilio.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';

@Module({
  imports: [SupabaseModule, ConfigModule],
  controllers: [MessagingController],
  providers: [MessagingService, TwilioService],
  exports: [MessagingService, TwilioService],
})
export class MessagingModule {}
