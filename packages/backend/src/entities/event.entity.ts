import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum EventStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('event')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime: string;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime: string;

  @Column({ nullable: true })
  venue: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'guest_count', nullable: true })
  maxGuests: number;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @Column({ nullable: true })
  budget: number;

  @Column({ nullable: true })
  notes: string;

  @Column({ name: 'special_requirements', nullable: true })
  specialRequirements: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}