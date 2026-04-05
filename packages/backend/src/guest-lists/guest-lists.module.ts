import { Module } from '@nestjs/common';
import { GuestListsController } from './guest-lists.controller';
import { GuestListsService } from './guest-lists.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, MessagingModule],
  controllers: [GuestListsController],
  providers: [GuestListsService],
  exports: [GuestListsService],
})
export class GuestListsModule {}
