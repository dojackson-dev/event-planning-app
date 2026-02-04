import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { ServiceItemsModule } from './service-items/service-items.module';
import { IntakeFormsModule } from './intake-forms/intake-forms.module';
import { EventsModule } from './events/events.module';
import { BookingsModule } from './bookings/bookings.module';
import { InvoicesModule } from './invoices/invoices.module';
// Commenting out feature modules that use TypeORM for now
// We'll refactor these to use Supabase client one by one
// import { UsersModule } from './users/users.module';
// import { ContractsModule } from './contracts/contracts.module';
// import { SecurityModule } from './security/security.module';
import { GuestListsModule } from './guest-lists/guest-lists.module';
// import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    AuthModule,
    ServiceItemsModule,
    IntakeFormsModule,
    EventsModule,
    BookingsModule,
    InvoicesModule,
    // ContractsModule, // Commented out - import is also commented
    GuestListsModule,
    // UsersModule,
    // SecurityModule,
    // MessagingModule,  // Keep this for scheduled messages
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
