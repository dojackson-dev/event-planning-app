import { Module } from '@nestjs/common';
import { InvoicesSupabaseController } from './invoices-supabase.controller';
import { InvoicesService } from './invoices-supabase.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule,
  ],
  controllers: [InvoicesSupabaseController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
