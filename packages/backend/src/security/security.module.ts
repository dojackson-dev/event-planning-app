import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityController } from './security.controller.js';
import { SecurityService } from './security.service.js';
import { SupabaseModule } from '../supabase/supabase.module.js';
import { MessagingModule } from '../messaging/messaging.module.js';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [SecurityController],
  providers: [SecurityService],
  exports: [SecurityService],
})
export class SecurityModule {}
