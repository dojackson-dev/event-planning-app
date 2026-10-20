import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantDigestService } from './assistant-digest.service';

@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [AssistantController],
  providers: [AssistantService, AssistantDigestService],
})
export class AssistantModule {}
