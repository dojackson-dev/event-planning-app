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
import { SecurityModule } from './security/security.module';
import { UsersModule } from './users/users.module.js';
import { GuestListsModule } from './guest-lists/guest-lists.module';
import { ContractsModule } from './contracts/contracts.module';
import { EstimatesModule } from './estimates/estimates.module';
import { StripeModule } from './stripe/stripe.module';
import { TrialModule } from './trial/trial.module';
import { VendorsModule } from './vendors/vendors.module';
import { UploadModule } from './upload/upload.module';
import { OwnerModule } from './owner/owner.module';
import { AdminModule } from './admin/admin.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { MessagingModule } from './messaging/messaging.module.js';
import { ClientPortalModule } from './client-portal/client-portal.module';
import { VendorInvoicesModule } from './vendor-invoices/vendor-invoices.module';

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
    GuestListsModule,
    ContractsModule,
    EstimatesModule,
    StripeModule,
    TrialModule,
    VendorsModule,
    UploadModule,
    OwnerModule,
    AdminModule,
    AppointmentsModule,
    SecurityModule,
    UsersModule,
    MessagingModule,
    ClientPortalModule,
    VendorInvoicesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
