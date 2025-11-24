import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { Message } from '../entities/message.entity';
import { MessageTemplate } from '../entities/message-template.entity';
import { ScheduledMessage } from '../entities/scheduled-message.entity';
import { User } from '../entities/user.entity';
import { Event } from '../entities/event.entity';
import { MessagingService } from './messaging.service';
import { MessagingController } from './messaging.controller';
import { TwilioService } from './twilio.service';
import { MessageTemplatesService } from './message-templates.service';
import { MessageTemplatesController } from './message-templates.controller';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { ScheduledMessagesController } from './scheduled-messages.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageTemplate, ScheduledMessage, User, Event]),
    ConfigModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [MessagingController, MessageTemplatesController, ScheduledMessagesController],
  providers: [MessagingService, TwilioService, MessageTemplatesService, ScheduledMessagesService],
  exports: [MessagingService, TwilioService, MessageTemplatesService, ScheduledMessagesService],
})
export class MessagingModule {}
