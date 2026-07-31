import { Module } from '@nestjs/common';
import { ScheduledEmailsService } from './scheduled-emails.service';
import { EmailPreferencesController } from './email-preferences.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [EmailPreferencesController],
  providers: [ScheduledEmailsService],
  exports: [ScheduledEmailsService],
})
export class ScheduledEmailsModule {}
