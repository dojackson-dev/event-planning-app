import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { DevEventsController } from './dev-events.controller';
import { EventsService } from './events.service';
import { EventCancellationService } from './event-cancellation.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { EventNotesModule } from '../event-notes/event-notes.module';

const useDevEvents = process.env.USE_DEV_EVENTS === 'true';
const eventsControllers = useDevEvents
  ? [DevEventsController]
  : [EventsController];

@Module({
  imports: [SupabaseModule, EventNotesModule],
  controllers: eventsControllers,
  providers: [EventsService, EventCancellationService],
  exports: [EventsService],
})
export class EventsModule {}
