import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { DevEventsController } from './dev-events.controller';
import { EventsService } from './events.service';
import { SupabaseModule } from '../supabase/supabase.module';

const useDevEvents = process.env.USE_DEV_EVENTS === 'true';
const eventsControllers = useDevEvents
  ? [DevEventsController]
  : [EventsController];

@Module({
  imports: [SupabaseModule],
  controllers: eventsControllers,
  providers: [EventsService],
  exports: [EventsService]
})
export class EventsModule {}
