import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class TeamModule {}
