import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityController } from './security.controller.js';
import { SecurityService } from './security.service.js';
import { SecurityEventsController } from './security-events.controller';
import { SecurityEventsService } from './security-events.service';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { MessagingModule } from '../messaging/messaging.module.js';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [SecurityController, SecurityEventsController],
  providers: [SecurityService, SecurityEventsService],
  exports: [SecurityService],
})
export class SecurityModule {}
