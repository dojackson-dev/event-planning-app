import { Controller, Get, Post, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { MessagingService } from './messaging.service';
import { Message } from '../entities/message.entity';

@Controller('messages')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get()
  async findAll(
    @Query('eventId') eventId?: string,
    @Query('userId') userId?: string,
  ): Promise<Message[]> {
    if (eventId) {
      return this.messagingService.findByEvent(parseInt(eventId));
    }
    if (userId) {
      return this.messagingService.findByUser(parseInt(userId));
    }
    return this.messagingService.findAll();
  }

  @Get('stats')
  async getStats() {
    return this.messagingService.getMessageStats();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Message | null> {
    return this.messagingService.findOne(id);
  }

  @Post('send')
  async sendMessage(@Body() messageData: {
    recipientPhone: string;
    recipientName: string;
    recipientType: 'client' | 'guest' | 'security' | 'custom';
    userId?: number;
    eventId?: number;
    messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';
    content: string;
  }): Promise<Message> {
    return this.messagingService.sendMessage(messageData);
  }

  @Post('send-bulk')
  async sendBulkMessages(@Body() data: {
    messages: Array<{
      recipientPhone: string;
      recipientName: string;
      recipientType: 'client' | 'guest' | 'security' | 'custom';
      userId?: number;
      eventId?: number;
      messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';
      content: string;
    }>;
  }): Promise<Message[]> {
    return this.messagingService.sendBulkMessages(data.messages);
  }

  @Post('event-reminder/:eventId')
  async sendEventReminder(
    @Param('eventId', ParseIntPipe) eventId: number,
    @Body() data?: { message?: string },
  ): Promise<Message[]> {
    return this.messagingService.sendEventReminder(eventId, data?.message);
  }

  @Post('invoice-update/:userId/:invoiceId')
  async sendInvoiceUpdate(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('invoiceId', ParseIntPipe) invoiceId: number,
    @Body() data: { message: string },
  ): Promise<Message> {
    return this.messagingService.sendInvoiceUpdate(userId, invoiceId, data.message);
  }

  @Post(':id/refresh-status')
  async refreshStatus(@Param('id', ParseIntPipe) id: number): Promise<Message | null> {
    return this.messagingService.updateMessageStatus(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.messagingService.deleteMessage(id);
  }
}
