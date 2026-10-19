import { Module } from '@nestjs/common';
import { ContactController } from './contact.controller';
import { DemoRequestsService } from './demo-requests.service';
import { MailModule } from '../mail/mail.module';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [MailModule, SupabaseModule],
  controllers: [ContactController],
  providers: [DemoRequestsService],
})
export class ContactModule {}
