import { Module } from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliatesController } from './affiliates.controller';
import { LeadsService } from './leads.service';
import { LeadActivitiesService } from './lead-activities.service';
import { LeadImportExportService } from './lead-import-export.service';
import { SalesSettingsService } from './sales-settings.service';
import { OutreachService } from './outreach.service';
import { OutreachPublicController } from './outreach-public.controller';
import { AffiliateGuard } from './guards/affiliate.guard';
import { SupabaseModule } from '../supabase/supabase.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [SupabaseModule, MailModule],
  controllers: [AffiliatesController, OutreachPublicController],
  providers: [
    AffiliatesService,
    LeadsService,
    LeadActivitiesService,
    LeadImportExportService,
    SalesSettingsService,
    OutreachService,
    AffiliateGuard,
  ],
  exports: [AffiliatesService],
})
export class AffiliatesModule {}
