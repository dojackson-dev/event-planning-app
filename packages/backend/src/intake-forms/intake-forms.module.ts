import { Module } from '@nestjs/common';
import { IntakeFormsController } from './intake-forms.controller';
import { IntakeFormsService } from './intake-forms.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';
import { MessagingModule } from '../messaging/messaging.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [SupabaseModule, MailModule, MessagingModule, EventsModule],
  controllers: [IntakeFormsController],
  providers: [IntakeFormsService],
  exports: [IntakeFormsService],
})
export class IntakeFormsModule {}
