import { Global, Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { PromoterAccessService } from './promoter-access.service';
import { PromoterTeamController } from './promoter-team.controller';
import { PromoterTeamService } from './promoter-team.service';

// Global so promoter-facing controllers can inject PromoterAccessService without each module importing this one.
@Global()
@Module({
  imports: [MailModule],
  controllers: [PromoterTeamController],
  providers: [PromoterAccessService, PromoterTeamService],
  exports: [PromoterAccessService, PromoterTeamService],
})
export class PromoterTeamModule {}
