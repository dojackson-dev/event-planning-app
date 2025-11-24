import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'recipient_phone' })
  recipientPhone: string;

  @Column({ name: 'recipient_name' })
  recipientName: string;

  @Column({ name: 'recipient_type' })
  recipientType: 'client' | 'guest' | 'security' | 'custom';

  @Column({ nullable: true, name: 'user_id' })
  userId?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ nullable: true, name: 'event_id' })
  eventId?: number;

  @ManyToOne(() => Event, { nullable: true })
  @JoinColumn({ name: 'event_id' })
  event?: Event;

  @Column({ name: 'message_type' })
  messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';

  @Column({ type: 'text' })
  content: string;

  @Column({ default: 'pending' })
  status: 'pending' | 'sent' | 'delivered' | 'failed';

  @Column({ nullable: true, name: 'twilio_sid' })
  twilioSid?: string;

  @Column({ nullable: true, name: 'error_message', type: 'text' })
  errorMessage?: string;

  @Column({ nullable: true, name: 'sent_at', type: 'timestamp' })
  sentAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
