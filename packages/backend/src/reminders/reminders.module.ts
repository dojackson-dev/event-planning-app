import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, MailModule, MessagingModule],
  providers: [RemindersService],
})
export class RemindersModule {}
