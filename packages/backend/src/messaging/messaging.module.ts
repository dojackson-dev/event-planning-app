import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { Event } from '../entities/event.entity';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { TwilioService } from './twilio.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User, Event]),
    ConfigModule,
  ],
  controllers: [MessagingController],
  providers: [MessagingService, TwilioService],
  exports: [MessagingService, TwilioService],
})
export class MessagingModule {}
