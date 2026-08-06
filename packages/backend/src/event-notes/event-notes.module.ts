import { Module } from '@nestjs/common';
import { EventNotesController } from './event-notes.controller';
import { EventNotesService } from './event-notes.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [EventNotesController],
  providers: [EventNotesService],
  exports: [EventNotesService],
})
export class EventNotesModule {}
