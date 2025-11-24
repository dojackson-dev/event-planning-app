import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../entities/message.entity';
import { User } from '../entities/user.entity';
import { Event } from '../entities/event.entity';
import { TwilioService } from './twilio.service';

@Injectable()
export class MessagingService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private twilioService: TwilioService,
  ) {}

  async findAll(): Promise<Message[]> {
    return this.messageRepository.find({
      relations: ['user', 'event'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByEvent(eventId: number): Promise<Message[]> {
    return this.messageRepository.find({
      where: { eventId },
      relations: ['user', 'event'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: number): Promise<Message[]> {
    return this.messageRepository.find({
      where: { userId },
      relations: ['user', 'event'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Message | null> {
    return this.messageRepository.findOne({
      where: { id },
      relations: ['user', 'event'],
    });
  }

  async sendMessage(messageData: {
    recipientPhone: string;
    recipientName: string;
    recipientType: 'client' | 'guest' | 'security' | 'custom';
    userId?: number;
    eventId?: number;
    messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';
    content: string;
  }): Promise<Message> {
    const message = this.messageRepository.create({
      ...messageData,
      status: 'pending',
    });

    const savedMessage = await this.messageRepository.save(message);

    try {
      const result = await this.twilioService.sendSMS(
        messageData.recipientPhone,
        messageData.content,
      );

      savedMessage.status = 'sent';
      savedMessage.twilioSid = result.sid;
      savedMessage.sentAt = new Date();
    } catch (error) {
      savedMessage.status = 'failed';
      savedMessage.errorMessage = error.message;
    }

    return this.messageRepository.save(savedMessage);
  }

  async sendBulkMessages(messages: Array<{
    recipientPhone: string;
    recipientName: string;
    recipientType: 'client' | 'guest' | 'security' | 'custom';
    userId?: number;
    eventId?: number;
    messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';
    content: string;
  }>): Promise<Message[]> {
    const results: Message[] = [];

    for (const messageData of messages) {
      try {
        const message = await this.sendMessage(messageData);
        results.push(message);
      } catch (error) {
        console.error(`Failed to send message to ${messageData.recipientPhone}:`, error);
        const failedMessage = this.messageRepository.create({
          ...messageData,
          status: 'failed',
          errorMessage: error.message,
        });
        results.push(await this.messageRepository.save(failedMessage));
      }
    }

    return results;
  }

  async sendEventReminder(eventId: number, customMessage?: string): Promise<Message[]> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId as any },
      relations: ['owner'],
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const eventDate = new Date(event.date);
    const message = customMessage || 
      `Reminder: Your event "${event.name}" is scheduled for ${eventDate.toLocaleDateString()} at ${eventDate.toLocaleTimeString()}. Looking forward to seeing you!`;

    const messagesData: Array<{
      recipientPhone: string;
      recipientName: string;
      recipientType: 'client' | 'guest' | 'security' | 'custom';
      userId?: number;
      eventId?: number;
      messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';
      content: string;
    }> = [];

    // Send to client if phone exists
    if (event.owner?.phone) {
      messagesData.push({
        recipientPhone: event.owner.phone,
        recipientName: `${event.owner.firstName} ${event.owner.lastName}`,
        recipientType: 'client' as const,
        userId: event.owner.id,
        eventId: event.id,
        messageType: 'reminder' as const,
        content: message,
      });
    }

    return this.sendBulkMessages(messagesData);
  }

  async sendInvoiceUpdate(userId: number, invoiceId: number, message: string): Promise<Message> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.phone) {
      throw new Error('User does not have a phone number');
    }

    return this.sendMessage({
      recipientPhone: user.phone,
      recipientName: `${user.firstName} ${user.lastName}`,
      recipientType: 'client',
      userId: user.id,
      messageType: 'invoice',
      content: message,
    });
  }

  async updateMessageStatus(id: number): Promise<Message | null> {
    const message = await this.messageRepository.findOne({ where: { id } });

    if (!message || !message.twilioSid) {
      return message;
    }

    try {
      const status = await this.twilioService.getMessageStatus(message.twilioSid);
      message.status = status as any;
      return this.messageRepository.save(message);
    } catch (error) {
      console.error('Failed to update message status:', error);
      return message;
    }
  }

  async deleteMessage(id: number): Promise<void> {
    await this.messageRepository.delete(id);
  }

  async getMessageStats(): Promise<{
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
  }> {
    const [total, sent, delivered, failed, pending] = await Promise.all([
      this.messageRepository.count(),
      this.messageRepository.count({ where: { status: 'sent' } }),
      this.messageRepository.count({ where: { status: 'delivered' } }),
      this.messageRepository.count({ where: { status: 'failed' } }),
      this.messageRepository.count({ where: { status: 'pending' } }),
    ]);

    return { total, sent, delivered, failed, pending };
  }
}
