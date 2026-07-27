import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EstimatesController } from './estimates.controller';
import { EstimatesService } from './estimates.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule, MailModule],
  controllers: [EstimatesController],
  providers: [EstimatesService],
  exports: [EstimatesService],
})
export class EstimatesModule {}
