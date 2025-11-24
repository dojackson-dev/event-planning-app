import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Booking } from './booking.entity';

export enum ContractStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  SIGNED = 'signed',
  CANCELLED = 'cancelled',
}

@Entity()
export class Contract {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  contractNumber: string;

  @Column()
  ownerId: number; // Owner who created the contract

  @ManyToOne(() => User)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @Column({ nullable: true })
  bookingId: number;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;

  @Column()
  clientId: number; // Client who needs to sign

  @ManyToOne(() => User)
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column()
  title: string;

  @Column('text', { nullable: true })
  description: string;

  @Column()
  fileUrl: string; // URL to the uploaded contract file

  @Column({ nullable: true })
  fileName: string;

  @Column({ nullable: true })
  fileSize: number; // in bytes

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.DRAFT,
  })
  status: ContractStatus;

  @Column({ type: 'timestamp', nullable: true })
  sentDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  signedDate: Date;

  @Column({ nullable: true })
  signatureData: string; // Base64 encoded signature image

  @Column({ nullable: true })
  signerName: string;

  @Column({ nullable: true })
  signerIpAddress: string;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
