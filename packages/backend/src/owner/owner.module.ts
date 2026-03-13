import { Module } from '@nestjs/common';
import { OwnerController } from './owner.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [OwnerController],
})
export class OwnerModule {}
