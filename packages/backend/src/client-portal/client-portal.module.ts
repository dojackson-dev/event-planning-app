import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { StripeModule } from '../stripe/stripe.module';
import { ClientAuthService } from './client-auth.service';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalController } from './client-portal.controller';

@Module({
  imports: [SupabaseModule, MessagingModule, StripeModule],
  controllers: [ClientPortalController],
  providers: [ClientAuthService, ClientPortalService],
})
export class ClientPortalModule {}
