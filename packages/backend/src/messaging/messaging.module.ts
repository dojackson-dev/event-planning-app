import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service.js';
import { MessagingController } from './messaging.controller.js';
import { TwilioService } from './twilio.service.js';
import { SmsNotificationsService } from './sms-notifications.service';
import { MessageTemplatesController } from './message-templates.controller';
import { MessageTemplatesService } from './message-templates.service';
import { SupabaseModule } from '../supabase/supabase.module.js';

@Module({
  imports: [SupabaseModule, ConfigModule],
  controllers: [MessagingController, MessageTemplatesController],
  providers: [
    MessagingService,
    TwilioService,
    SmsNotificationsService,
    MessageTemplatesService,
  ],
  exports: [MessagingService, TwilioService, SmsNotificationsService],
})
export class MessagingModule {}
