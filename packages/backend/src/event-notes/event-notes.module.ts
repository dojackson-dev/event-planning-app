import { Module } from '@nestjs/common';
import { EventNotesController } from './event-notes.controller';
import { EventNotesService } from './event-notes.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, MessagingModule],
  controllers: [EventNotesController],
  providers: [EventNotesService],
  exports: [EventNotesService],
})
export class EventNotesModule {}
