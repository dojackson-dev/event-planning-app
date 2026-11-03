import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ShortLinksController } from './short-links.controller';
import { ShortLinksService } from './short-links.service';

@Module({
  imports: [SupabaseModule],
  controllers: [ShortLinksController],
  providers: [ShortLinksService],
})
export class ShortLinksModule {}
