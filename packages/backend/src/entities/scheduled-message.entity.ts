import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Event } from './event.entity';
import { MessageTemplate } from './message-template.entity';

@Entity('scheduled_messages')
export class ScheduledMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'event_id' })
  eventId: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'template_id', nullable: true })
  templateId?: number;

  @ManyToOne(() => MessageTemplate, { nullable: true })
  @JoinColumn({ name: 'template_id' })
  template?: MessageTemplate;

  @Column({ name: 'recipient_type' })
  recipientType: 'client' | 'guest' | 'security' | 'all';

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'scheduled_for', type: 'timestamp' })
  scheduledFor: Date;

  @Column({ default: 'pending' })
  status: 'pending' | 'sent' | 'cancelled' | 'failed';

  @Column({ name: 'message_id', nullable: true })
  messageId?: number; // Reference to sent message

  @Column({ nullable: true, name: 'sent_at', type: 'timestamp' })
  sentAt?: Date;

  @Column({ nullable: true, name: 'error_message', type: 'text' })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
