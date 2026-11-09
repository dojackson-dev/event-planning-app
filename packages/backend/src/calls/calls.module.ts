import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { CallsController } from './calls.controller';
import { CallsWebhookController } from './calls-webhook.controller';
import { CallsService } from './calls.service';
import { CallStaffGuard } from './call-staff.guard';
import { TwilioSignatureGuard } from './twilio-signature.guard';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [CallsController, CallsWebhookController],
  providers: [CallsService, CallStaffGuard, TwilioSignatureGuard],
})
export class CallsModule {}
