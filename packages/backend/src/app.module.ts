import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
// Commenting out feature modules that use TypeORM for now
// We'll refactor these to use Supabase client one by one
// import { UsersModule } from './users/users.module';
// import { EventsModule } from './events/events.module';
// import { BookingsModule } from './bookings/bookings.module';
// import { InvoicesModule } from './invoices/invoices.module';
// import { ServiceItemsModule } from './service-items/service-items.module';
// import { ContractsModule } from './contracts/contracts.module';
// import { SecurityModule } from './security/security.module';
// import { GuestListsModule } from './guest-lists/guest-lists.module';
// import { MessagingModule } from './messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    AuthModule,
    // UsersModule,
    // EventsModule,
    // BookingsModule,
    // InvoicesModule,
    // ServiceItemsModule,
    // ContractsModule,
    // SecurityModule,
    // GuestListsModule,
    // MessagingModule,  // Keep this for scheduled messages
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
