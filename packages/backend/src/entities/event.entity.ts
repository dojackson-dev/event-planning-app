import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum EventStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity()
export class Event {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  dayOfWeek: string; // e.g., 'Monday'

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'time', nullable: true })
  setupTime: string;

  @Column()
  venue: string;

  @Column({ nullable: true })
  maxGuests: number;

  @Column()
  tenantId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column()
  ownerId: number;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  // Services
  @Column({ nullable: true })
  caterer: string;

  @Column({ nullable: true })
  decorator: string;

  @Column({ nullable: true })
  balloonDecorator: string;

  @Column({ nullable: true })
  marquee: string;

  @Column({ nullable: true })
  musicType: string; // 'dj', 'band', 'mc'

  @Column({ nullable: true })
  barOption: string; // type of bar

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}