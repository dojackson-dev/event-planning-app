import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SupabaseModule, MailModule],
  providers: [RemindersService],
})
export class RemindersModule {}
