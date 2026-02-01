import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ServiceItemCategory {
  FACILITY_RENTAL = 'facility_rental',
  SECURITY_DEPOSIT = 'security_deposit',
  SOUND_SYSTEM = 'sound_system',
  AV_EQUIPMENT = 'av_equipment',
  PLANNING_SERVICES = 'planning_services',
  ADDITIONAL_TIME = 'additional_time',
  HOSTING_SERVICES = 'hosting_services',
  CATERING = 'catering',
  BAR_SERVICES = 'bar_services',
  SECURITY_SERVICES = 'security_services',
  DECORATIONS = 'decorations',
  SALES_TAX = 'sales_tax',
  ITEMS = 'items',
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
