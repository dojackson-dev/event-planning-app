import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { ClientAuthService } from './client-auth.service';
import { ClientPortalService } from './client-portal.service';
import { ClientPortalController } from './client-portal.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [ClientPortalController],
  providers: [ClientAuthService, ClientPortalService],
})
export class ClientPortalModule {}
