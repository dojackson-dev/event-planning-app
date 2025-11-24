import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('message_templates')
export class MessageTemplate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'message_type' })
  messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom';

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'send_before_days', nullable: true })
  sendBeforeDays?: number; // Days before event

  @Column({ name: 'send_time', nullable: true })
  sendTime?: string; // HH:MM format

  @Column({ name: 'repeat_interval_days', nullable: true })
  repeatIntervalDays?: number; // For recurring reminders

  @Column({ name: 'recipient_type' })
  recipientType: 'client' | 'guest' | 'security' | 'all';

  @Column({ name: 'auto_send', default: false })
  autoSend: boolean; // Auto-send when conditions are met

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
