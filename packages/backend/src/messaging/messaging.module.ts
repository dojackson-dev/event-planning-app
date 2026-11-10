import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingService } from './messaging.service.js';
import { MessagingController } from './messaging.controller.js';
import { TwilioService } from './twilio.service.js';
import { SmsNotificationsService } from './sms-notifications.service';
import { MessageTemplatesController } from './message-templates.controller';
import { MessageTemplatesService } from './message-templates.service';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { MailModule } from '../mail/mail.module';
import { MessageAlertsService } from './message-alerts.service';
import { TwilioSignatureGuard } from '../calls/twilio-signature.guard';

@Module({
  imports: [SupabaseModule, ConfigModule, MailModule],
  controllers: [MessagingController, MessageTemplatesController],
  providers: [
    MessagingService,
    TwilioService,
    SmsNotificationsService,
    MessageTemplatesService,
    TwilioSignatureGuard,
    MessageAlertsService,
  ],
  exports: [
    MessagingService,
    TwilioService,
    SmsNotificationsService,
    MessageAlertsService,
  ],
})
export class MessagingModule {}
