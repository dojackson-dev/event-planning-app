import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { SupabaseService } from '../supabase/supabase.service';
import { BookingsController } from './bookings.controller';

describe('BookingsController', () => {
  let controller: BookingsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookingsController],
      providers: [
        { provide: BookingsService, useValue: {} },
        { provide: SupabaseService, useValue: {} },
      ],
    }).compile();

    controller = module.get<BookingsController>(BookingsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
