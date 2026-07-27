import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { ClientPortalModule } from '../client-portal/client-portal.module';

@Module({
  imports: [SupabaseModule, ClientPortalModule],
  controllers: [UploadController],
})
export class UploadModule {}
