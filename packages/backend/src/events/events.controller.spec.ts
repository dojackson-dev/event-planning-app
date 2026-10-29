import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { EventCancellationService } from './event-cancellation.service';
import { SupabaseService } from '../supabase/supabase.service';
import { EventsController } from './events.controller';

describe('EventsController', () => {
  let controller: EventsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        { provide: EventsService, useValue: {} },
        { provide: SupabaseService, useValue: {} },
        { provide: EventCancellationService, useValue: {} },
      ],
    }).compile();

    controller = module.get<EventsController>(EventsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
