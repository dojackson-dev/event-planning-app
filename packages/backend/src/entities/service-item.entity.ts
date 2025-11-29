import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ServiceItemCategory {
  FACILITY = 'facility',
  CATERING = 'catering',
  ITEMS = 'items',
  SECURITY = 'security',
  BAR = 'bar',
  DEPOSIT = 'deposit',
  SOUND_SYSTEM = 'sound_system',
  AV = 'av',
  PLANNING = 'planning',
  DECORATIONS = 'decorations',
  ADDITIONAL_TIME = 'additional_time',
  SALES_TAX = 'sales_tax',
  HOSTING = 'hosting',
  MISC = 'misc',
}

@Entity()
export class ServiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: ServiceItemCategory,
  })
  category: ServiceItemCategory;

  @Column('decimal', { precision: 10, scale: 2 })
  defaultPrice: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ nullable: true })
  ownerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
