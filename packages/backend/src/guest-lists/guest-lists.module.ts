import { Module } from '@nestjs/common';
import { GuestListsController } from './guest-lists.controller';
import { GuestListsService } from './guest-lists.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [GuestListsController],
  providers: [GuestListsService],
  exports: [GuestListsService],
})
export class GuestListsModule {}
