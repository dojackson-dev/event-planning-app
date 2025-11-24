import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice, InvoiceStatus } from '../entities/invoice.entity';
import { InvoiceItem, DiscountType } from '../entities/invoice-item.entity';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(Invoice)
    private invoiceRepository: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private invoiceItemRepository: Repository<InvoiceItem>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async findAll(): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      relations: ['booking', 'booking.user', 'booking.event', 'items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByOwner(ownerId: number): Promise<Invoice[]> {
    return this.invoiceRepository.find({
      where: { ownerId },
      relations: ['booking', 'booking.user', 'booking.event', 'items'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Invoice | null> {
    return this.invoiceRepository.findOne({
      where: { id },
      relations: ['booking', 'booking.user', 'booking.event', 'items'],
    });
  }

  async create(invoiceData: Partial<Invoice>): Promise<Invoice> {
    // Generate invoice number
    const count = await this.invoiceRepository.count();
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

    // Calculate totals
    const subtotal = invoiceData.items?.reduce((sum, item) => sum + Number(item.amount), 0) || 0;
    const taxAmount = subtotal * (Number(invoiceData.taxRate) || 0) / 100;
    const totalAmount = subtotal + taxAmount - Number(invoiceData.discountAmount || 0);
    const amountDue = totalAmount - Number(invoiceData.amountPaid || 0);

    const invoice = this.invoiceRepository.create({
      ...invoiceData,
      invoiceNumber,
      subtotal,
      taxAmount,
      totalAmount,
      amountDue,
      status: invoiceData.status || InvoiceStatus.DRAFT,
    });

    return this.invoiceRepository.save(invoice);
  }

  async update(id: number, invoiceData: Partial<Invoice>): Promise<Invoice | null> {
    const invoice = await this.findOne(id);
    
    if (!invoice) {
      return null;
    }

    // Recalculate totals if items or rates changed
    if (invoiceData.items || invoiceData.taxRate !== undefined || invoiceData.discountAmount !== undefined) {
      const items = invoiceData.items || invoice.items;
      const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
      const taxRate = invoiceData.taxRate !== undefined ? invoiceData.taxRate : invoice.taxRate;
      const discountAmount = invoiceData.discountAmount !== undefined ? invoiceData.discountAmount : invoice.discountAmount;
      const taxAmount = subtotal * Number(taxRate) / 100;
      const totalAmount = subtotal + taxAmount - Number(discountAmount);
      const amountPaid = invoiceData.amountPaid !== undefined ? invoiceData.amountPaid : invoice.amountPaid;
      const amountDue = totalAmount - Number(amountPaid);

      invoiceData = {
        ...invoiceData,
        subtotal,
        taxAmount,
        totalAmount,
        amountDue,
      };
    }

    // Update status based on payment
    if (invoiceData.amountPaid !== undefined) {
      const totalAmount = invoiceData.totalAmount || invoice.totalAmount;
      if (Number(invoiceData.amountPaid) >= Number(totalAmount)) {
        invoiceData.status = InvoiceStatus.PAID;
        invoiceData.paidDate = new Date();
      } else if (Number(invoiceData.amountPaid) > 0) {
        invoiceData.status = InvoiceStatus.SENT;
      }
    }

    await this.invoiceRepository.update(id, invoiceData);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.invoiceRepository.delete(id);
  }

  async recordPayment(id: number, amount: number): Promise<Invoice | null> {
    const invoice = await this.findOne(id);
    
    if (!invoice) {
      return null;
    }
    
    const newAmountPaid = Number(invoice.amountPaid) + amount;
    
    return this.update(id, { amountPaid: newAmountPaid });
  }

  async generateFromBooking(bookingId: number): Promise<Invoice> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new Error('Booking not found');
    }

    const issueDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days payment terms

    const invoice = await this.create({
      bookingId,
      items: [],
      taxRate: 0, // Set your default tax rate
      discountAmount: 0,
      amountPaid: booking.deposit || 0,
      issueDate,
      dueDate,
      status: InvoiceStatus.DRAFT,
      terms: 'Payment due within 30 days',
    });

    // Create invoice item separately
    const invoiceItem = this.invoiceItemRepository.create({
      invoiceId: invoice.id,
      description: 'Event Booking',
      quantity: 1,
      standardPrice: booking.totalPrice,
      unitPrice: booking.totalPrice,
      subtotal: booking.totalPrice,
      discountType: DiscountType.NONE,
      discountValue: 0,
      discountAmount: 0,
      amount: booking.totalPrice,
      sortOrder: 0,
    });

    await this.invoiceItemRepository.save(invoiceItem);

    const result = await this.findOne(invoice.id);
    if (!result) {
      throw new Error('Failed to create invoice');
    }
    return result;
  }
}
