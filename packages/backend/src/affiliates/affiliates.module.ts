import { Module } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesController } from './affiliates.controller';
import { AffiliateGuard } from './guards/affiliate.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [AffiliatesController],
  providers: [AffiliatesService, AffiliateGuard],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
