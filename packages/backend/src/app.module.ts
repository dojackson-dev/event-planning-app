import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './entities/user.entity';
import { Event } from './entities/event.entity';
import { Booking } from './entities/booking.entity';
import { Tenant } from './entities/tenant.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { ServiceItem } from './entities/service-item.entity';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { BookingsModule } from './bookings/bookings.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ServiceItemsModule } from './service-items/service-items.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      database: process.env.DB_NAME || 'event_planning',
      entities: [User, Event, Booking, Tenant, Invoice, InvoiceItem, ServiceItem],
      synchronize: true, // For development; disable in production
    }),
    UsersModule,
    EventsModule,
    BookingsModule,
    InvoicesModule,
    ServiceItemsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
