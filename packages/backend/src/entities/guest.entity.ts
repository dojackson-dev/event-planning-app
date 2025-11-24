import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { GuestList } from './guest-list.entity';

@Entity('guests')
export class Guest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'guest_list_id' })
  guestListId: number;

  @ManyToOne(() => GuestList, guestList => guestList.guests)
  @JoinColumn({ name: 'guest_list_id' })
  guestList: GuestList;

  @Column()
  name: string;

  @Column()
  phone: string;

  @Column({ name: 'plus_one_count', default: 0 })
  plusOneCount: number;

  @Column({ name: 'has_arrived', default: false })
  hasArrived: boolean;

  @Column({ name: 'arrived_at', type: 'timestamp', nullable: true })
  arrivedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
