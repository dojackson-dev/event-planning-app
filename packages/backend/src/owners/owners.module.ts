import { Module } from '@nestjs/common'
import { OwnersController } from './owners.controller'
import { OwnersService } from './owners.service'
import { SupabaseModule } from '../supabase/supabase.module'

@Module({
  imports: [SupabaseModule],
  controllers: [OwnersController],
  providers: [OwnersService],
  exports: [OwnersService],
})
export class OwnersModule {}
