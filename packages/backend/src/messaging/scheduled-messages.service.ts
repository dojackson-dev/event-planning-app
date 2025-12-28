import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ScheduledMessage } from '../entities/scheduled-message.entity';
import { Event } from '../entities/event.entity';
import { User } from '../entities/user.entity';
import { MessageTemplate } from '../entities/message-template.entity';
import { MessagingService } from './messaging.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ScheduledMessagesService {
  constructor(
    @InjectRepository(ScheduledMessage)
    private scheduledMessageRepository: Repository<ScheduledMessage>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(MessageTemplate)
    private templateRepository: Repository<MessageTemplate>,
    private messagingService: MessagingService,
  ) {}

  async findAll(): Promise<ScheduledMessage[]> {
    return this.scheduledMessageRepository.find({
      relations: ['event', 'template'],
      order: { scheduledFor: 'ASC' },
    });
  }

  async findByEvent(eventId: string): Promise<ScheduledMessage[]> {
    return this.scheduledMessageRepository.find({
      where: { eventId },
      relations: ['template'],
      order: { scheduledFor: 'ASC' },
    });
  }

  async findPending(): Promise<ScheduledMessage[]> {
    return this.scheduledMessageRepository.find({
      where: { status: 'pending' },
      relations: ['event', 'template'],
      order: { scheduledFor: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ScheduledMessage | null> {
    return this.scheduledMessageRepository.findOne({
      where: { id },
      relations: ['event', 'template'],
    });
  }

  async create(scheduledMessageData: {
    eventId: string;
    templateId?: number;
    recipientType: 'client' | 'guest' | 'security' | 'all';
    content: string;
    scheduledFor: Date;
  }): Promise<ScheduledMessage> {
    const scheduledMessage = this.scheduledMessageRepository.create(scheduledMessageData);
    return this.scheduledMessageRepository.save(scheduledMessage);
  }

  async scheduleFromTemplate(eventId: string, templateId: number): Promise<ScheduledMessage> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    // Calculate scheduled time
    const eventDate = new Date(event.date);
    let scheduledFor = new Date(eventDate);

    if (template.sendBeforeDays) {
      scheduledFor.setDate(scheduledFor.getDate() - template.sendBeforeDays);
    }

    if (template.sendTime) {
      const [hours, minutes] = template.sendTime.split(':').map(Number);
      scheduledFor.setHours(hours, minutes, 0, 0);
    }

    // Replace placeholders in template content
    const content = this.replacePlaceholders(template.content, event);

    return this.create({
      eventId: event.id,
      templateId: template.id,
      recipientType: template.recipientType,
      content,
      scheduledFor,
    });
  }

  async scheduleMultipleFromTemplate(eventId: string, templateId: number): Promise<ScheduledMessage[]> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
    });

    if (!template || !template.repeatIntervalDays) {
      return [await this.scheduleFromTemplate(eventId, templateId)];
    }

    const event = await this.eventRepository.findOne({
      where: { id: eventId as any },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const scheduledMessages: ScheduledMessage[] = [];
    const eventDate = new Date(event.date);
    let currentDate = new Date();

    // Schedule recurring messages
    while (currentDate < eventDate) {
      let scheduledFor = new Date(eventDate);
      const daysUntilEvent = Math.floor((eventDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

      if (template.sendBeforeDays && daysUntilEvent >= template.sendBeforeDays) {
        scheduledFor.setDate(scheduledFor.getDate() - template.sendBeforeDays);

        if (template.sendTime) {
          const [hours, minutes] = template.sendTime.split(':').map(Number);
          scheduledFor.setHours(hours, minutes, 0, 0);
        }

        if (scheduledFor > currentDate) {
          const content = this.replacePlaceholders(template.content, event);
          const scheduled = await this.create({
            eventId: event.id,
            templateId: template.id,
            recipientType: template.recipientType,
            content,
            scheduledFor,
          });
          scheduledMessages.push(scheduled);
        }
      }

      currentDate.setDate(currentDate.getDate() + template.repeatIntervalDays);
    }

    return scheduledMessages;
  }

  async cancel(id: number): Promise<ScheduledMessage | null> {
    const scheduledMessage = await this.findOne(id);
    if (!scheduledMessage || scheduledMessage.status !== 'pending') {
      return null;
    }

    scheduledMessage.status = 'cancelled';
    return this.scheduledMessageRepository.save(scheduledMessage);
  }

  async delete(id: number): Promise<void> {
    await this.scheduledMessageRepository.delete(id);
  }

  // Cron job to process scheduled messages every minute
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledMessages() {
    const now = new Date();
    const dueMessages = await this.scheduledMessageRepository.find({
      where: {
        status: 'pending',
        scheduledFor: LessThanOrEqual(now),
      },
      relations: ['event', 'event.owner'],
    });

    for (const scheduledMessage of dueMessages) {
      try {
        await this.sendScheduledMessage(scheduledMessage);
      } catch (error) {
        console.error(`Failed to send scheduled message ${scheduledMessage.id}:`, error);
        scheduledMessage.status = 'failed';
        scheduledMessage.errorMessage = error.message;
        await this.scheduledMessageRepository.save(scheduledMessage);
      }
    }
  }

  private async sendScheduledMessage(scheduledMessage: ScheduledMessage): Promise<void> {
    const event = scheduledMessage.event;
    const messages: Array<{
      recipientPhone: string;
      recipientName: string;
      recipientType: 'client' | 'guest' | 'security' | 'custom';
      userId?: number;
      eventId?: string;
      messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';
      content: string;
    }> = [];

    // Determine recipients based on recipientType
    if (scheduledMessage.recipientType === 'client' || scheduledMessage.recipientType === 'all') {
      const owner = await this.userRepository.findOne({
        where: { id: parseInt(event.ownerId) },
      });
      if (owner?.phone) {
        messages.push({
          recipientPhone: owner.phone,
          recipientName: `${owner.firstName} ${owner.lastName}`,
          recipientType: 'client' as const,
          userId: owner.id,
          eventId: event.id,
          messageType: 'reminder' as const,
          content: scheduledMessage.content,
        });
      }
    }

    // TODO: Add guest and security recipients when needed

    if (messages.length > 0) {
      const sentMessages = await this.messagingService.sendBulkMessages(messages);
      scheduledMessage.status = 'sent';
      scheduledMessage.sentAt = new Date();
      scheduledMessage.messageId = sentMessages[0]?.id;
    } else {
      scheduledMessage.status = 'failed';
      scheduledMessage.errorMessage = 'No recipients found';
    }

    await this.scheduledMessageRepository.save(scheduledMessage);
  }

  private replacePlaceholders(content: string, event: Event): string {
    const eventDate = new Date(event.date);
    return content
      .replace(/\{event_name\}/g, event.name)
      .replace(/\{event_date\}/g, eventDate.toLocaleDateString())
      .replace(/\{event_time\}/g, eventDate.toLocaleTimeString())
      .replace(/\{event_location\}/g, event.venue || 'TBD');
  }
}
