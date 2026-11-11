import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { StripeModule } from '../stripe/stripe.module';
import { MailModule } from '../mail/mail.module';
import { VendorCatalogModule } from '../vendor-catalog/vendor-catalog.module';
import { ClientAuthService } from './client-auth.service';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalController } from './client-portal.controller';

@Module({
  imports: [
    SupabaseModule,
    MessagingModule,
    StripeModule,
    MailModule,
    VendorCatalogModule,
  ],
  controllers: [ClientPortalController],
  providers: [ClientAuthService, ClientPortalService],
  exports: [ClientAuthService],
})
export class ClientPortalModule {}
