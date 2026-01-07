import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { ScheduledMessage } from '../entities/scheduled-message.entity';

@Controller('scheduled-messages')
export class ScheduledMessagesController {
  constructor(private readonly scheduledMessagesService: ScheduledMessagesService) {}

  @Get()
  async findAll(): Promise<ScheduledMessage[]> {
    return this.scheduledMessagesService.findAll();
  }

  @Get('pending')
  async findPending(): Promise<ScheduledMessage[]> {
    return this.scheduledMessagesService.findPending();
  }

  @Get('event/:eventId')
  async findByEvent(@Param('eventId') eventId: string): Promise<ScheduledMessage[]> {
    return this.scheduledMessagesService.findByEvent(eventId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ScheduledMessage | null> {
    return this.scheduledMessagesService.findOne(id);
  }

  @Post()
  async create(@Body() data: {
    eventId: string;
    templateId?: number;
    recipientType: 'client' | 'guest' | 'security' | 'all';
    content: string;
    scheduledFor: Date;
  }): Promise<ScheduledMessage> {
    return this.scheduledMessagesService.create(data);
  }

  @Post('from-template')
  async scheduleFromTemplate(@Body() data: {
    eventId: string;
    templateId: number;
  }): Promise<ScheduledMessage> {
    return this.scheduledMessagesService.scheduleFromTemplate(data.eventId, data.templateId);
  }

  @Post('from-template-recurring')
  async scheduleMultipleFromTemplate(@Body() data: {
    eventId: string;
    templateId: number;
  }): Promise<ScheduledMessage[]> {
    return this.scheduledMessagesService.scheduleMultipleFromTemplate(data.eventId, data.templateId);
  }

  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number): Promise<ScheduledMessage | null> {
    return this.scheduledMessagesService.cancel(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.scheduledMessagesService.delete(id);
  }
}
