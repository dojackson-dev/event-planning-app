import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Event } from './event.entity';
import { Guest } from './guest.entity';

@Entity('guest_lists')
export class GuestList {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'client_id' })
  clientId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client: User;

  @Column({ name: 'event_id' })
  eventId: number;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @Column({ name: 'max_guests_per_person', default: 0 })
  maxGuestsPerPerson: number;

  @Column({ name: 'access_code', unique: true })
  accessCode: string;

  @Column({ name: 'share_token', unique: true })
  shareToken: string;

  @Column({ name: 'arrival_token', unique: true })
  arrivalToken: string;

  @Column({ name: 'is_locked', default: false })
  isLocked: boolean;

  @OneToMany(() => Guest, guest => guest.guestList)
  guests: Guest[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
