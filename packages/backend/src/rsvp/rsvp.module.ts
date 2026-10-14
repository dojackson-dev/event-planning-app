import { Module } from '@nestjs/common';
import { RsvpController } from './rsvp.controller';
import { RsvpService } from './rsvp.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { MessagingModule } from '../messaging/messaging.module';
import { MailModule } from '../mail/mail.module';
import { ClientPortalModule } from '../client-portal/client-portal.module';
import { GuestListsModule } from '../guest-lists/guest-lists.module';

@Module({
  imports: [
    SupabaseModule,
    MessagingModule,
    MailModule,
    ClientPortalModule,
    GuestListsModule,
  ],
  controllers: [RsvpController],
  providers: [RsvpService],
})
export class RsvpModule {}
