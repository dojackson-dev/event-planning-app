import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Invoice } from './invoice.entity';

export enum DiscountType {
  NONE = 'none',
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

@Entity()
export class InvoiceItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  invoiceId: number;

  @ManyToOne(() => Invoice, invoice => invoice.items)
  @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;

  @Column()
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  standardPrice: number; // Original/standard price

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number; // Actual price being charged (after adjustments)

  @Column('decimal', { precision: 10, scale: 2 })
  subtotal: number; // quantity * unitPrice (before item discount)

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.NONE,
  })
  discountType: DiscountType;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discountValue: number; // Percentage (e.g., 10 for 10%) or fixed amount

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  discountAmount: number; // Calculated discount amount

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number; // Final amount: subtotal - discountAmount

  @Column({ default: 0 })
  sortOrder: number;
}
