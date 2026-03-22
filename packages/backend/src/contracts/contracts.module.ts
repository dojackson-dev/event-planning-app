import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [SupabaseModule, ConfigModule, MessagingModule],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
