import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; // Business/Venue name

  @Column({ unique: true })
  subdomain: string; // Subdomain for hosted website (e.g., 'myvenue' -> myvenue.yourplatform.com)

  @Column()
  ownerId: number; // Reference to the owner user

  @Column({ nullable: true })
  customDomain: string; // Optional custom domain (e.g., www.myvenue.com)

  @Column({ default: 'active' })
  subscriptionStatus: string; // active, suspended, cancelled, trial

  @Column({ nullable: true })
  websiteSettings: string; // JSON string of website customization settings

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
