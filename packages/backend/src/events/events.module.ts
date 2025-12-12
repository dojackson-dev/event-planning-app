import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { DevEventsController } from './dev-events.controller';
import { EventsService } from './events.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [DevEventsController, EventsController],
  providers: [EventsService],
  exports: [EventsService]
})
export class EventsModule {}
