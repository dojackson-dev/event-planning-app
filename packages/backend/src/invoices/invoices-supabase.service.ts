import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SupabaseClient } from '@supabase/supabase-js';

export interface Invoice {
  id?: string;
  invoice_number: string;
  owner_id?: string;
  booking_id?: string;
  intake_form_id?: string;
  created_by?: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issue_date: string;
  due_date: string;
  paid_date?: string;
  notes?: string;
  terms?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id: string;
  service_item_id?: string;
  description: string;
  quantity: number;
  standard_price: number;
  unit_price: number;
  subtotal: number;
  discount_type: 'none' | 'percentage' | 'fixed';
  discount_value: number;
  discount_amount: number;
  amount: number;
  sort_order: number;
  created_at?: string;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private calculateInvoiceTotals(items: Partial<InvoiceItem>[], taxRate: number, discountAmount: number) {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;
    const amountDue = totalAmount;
    
    return { subtotal, taxAmount, totalAmount, amountDue };
  }

  private calculateItemAmounts(item: Partial<InvoiceItem>) {
    const quantity = Number(item.quantity) || 1;
    const unitPrice = Number(item.unit_price) || 0;
    const subtotal = quantity * unitPrice;
    
    let discountAmount = 0;
    if (item.discount_type === 'percentage') {
      discountAmount = subtotal * (Number(item.discount_value) / 100);
    } else if (item.discount_type === 'fixed') {
      discountAmount = Number(item.discount_value) || 0;
    }
    
    const amount = subtotal - discountAmount;
    
    return { subtotal, discountAmount, amount };
  }

  async findAll(supabase: SupabaseClient, userId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(*),
        intake_form:intake_forms(*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByOwner(supabase: SupabaseClient, userId: string, ownerId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(*),
        intake_form:intake_forms(*)
      `)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByIntakeForm(supabase: SupabaseClient, userId: string, intakeFormId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(*),
        intake_form:intake_forms(*)
      `)
      .eq('intake_form_id', intakeFormId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findOne(supabase: SupabaseClient, userId: string, id: string): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        booking:bookings(*),
        intake_form:intake_forms(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Invoice not found');
    return data;
  }

  async findInvoiceItems(supabase: SupabaseClient, userId: string, invoiceId: string): Promise<InvoiceItem[]> {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order');

    if (error) throw error;
    return data || [];
  }

  async create(supabase: SupabaseClient, userId: string, invoiceData: Partial<Invoice>, items?: Partial<InvoiceItem>[]): Promise<Invoice> {
    // Generate unique invoice number with timestamp to avoid duplicates
    const { data: maxInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    let nextNumber = 1;
    if (maxInvoice?.invoice_number) {
      const match = maxInvoice.invoice_number.match(/INV-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }
    
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNumber).padStart(5, '0')}`;

    // Calculate totals
    const { subtotal, taxAmount, totalAmount, amountDue } = this.calculateInvoiceTotals(
      items || [],
      Number(invoiceData.tax_rate) || 0,
      Number(invoiceData.discount_amount) || 0
    );

    // Insert invoice using snake_case column names
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        owner_id: invoiceData.owner_id || userId,
        created_by: userId,
        booking_id: invoiceData.booking_id || null,
        intake_form_id: invoiceData.intake_form_id || null,
        subtotal: subtotal,
        tax_rate: Number(invoiceData.tax_rate) || 0,
        tax_amount: taxAmount,
        discount_amount: Number(invoiceData.discount_amount) || 0,
        total_amount: totalAmount,
        amount_paid: Number(invoiceData.amount_paid) || 0,
        amount_due: amountDue,
        status: invoiceData.status || 'draft',
        issue_date: invoiceData.issue_date,
        due_date: invoiceData.due_date,
        notes: invoiceData.notes || null,
        terms: invoiceData.terms || null,
      })
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      throw new Error('Failed to create invoice');
    }
    
    const invoice = data as Invoice;

    // Create invoice items if provided
    if (items && items.length > 0) {
      await this.createInvoiceItems(supabase, userId, invoice.id!, items);
    }

    return invoice;
  }

  async createInvoiceItems(supabase: SupabaseClient, userId: string, invoiceId: string, items: Partial<InvoiceItem>[]): Promise<InvoiceItem[]> {
    const itemsWithCalculations = items.map((item, index) => {
      const { subtotal, discountAmount, amount } = this.calculateItemAmounts(item);
      
      return {
        invoice_id: invoiceId,
        service_item_id: item.service_item_id || null,
        description: item.description || '',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        subtotal,
        discount_amount: discountAmount,
        amount,
        sort_order: item.sort_order ?? index,
      };
    });

    const { data, error } = await supabase
      .from('invoice_items')
      .insert(itemsWithCalculations)
      .select();

    if (error) throw error;
    return data || [];
  }

  async addItemFromServiceItem(supabase: SupabaseClient, userId: string, invoiceId: string, serviceItemId: string, quantity: number = 1): Promise<InvoiceItem> {
    // Get service item details
    const { data: serviceItem, error: serviceError } = await supabase
      .from('service_items')
      .select('*')
      .eq('id', serviceItemId)
      .single();

    if (serviceError) throw new NotFoundException('Service item not found');

    // Get current max sort order
    const { data: existingItems } = await supabase
      .from('invoice_items')
      .select('sort_order')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const sortOrder = (existingItems?.[0]?.sort_order ?? -1) + 1;

    const { subtotal, discountAmount, amount } = this.calculateItemAmounts({
      quantity,
      unit_price: serviceItem.default_price,
      discount_type: 'none',
      discount_value: 0,
    });

    const { data, error } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoiceId,
        service_item_id: serviceItemId,
        description: serviceItem.name,
        quantity,
        standard_price: serviceItem.default_price,
        unit_price: serviceItem.default_price,
        subtotal,
        discount_type: 'none',
        discount_value: 0,
        discount_amount: discountAmount,
        amount,
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    // Recalculate invoice totals
    await this.recalculateInvoice(supabase, userId, invoiceId);

    return data;
  }

  async updateInvoiceItem(supabase: SupabaseClient, userId: string, itemId: string, itemData: Partial<InvoiceItem>): Promise<InvoiceItem> {
    const { subtotal, discountAmount, amount } = this.calculateItemAmounts({
      ...itemData,
      quantity: itemData.quantity,
      unit_price: itemData.unit_price,
      discount_type: itemData.discount_type,
      discount_value: itemData.discount_value,
    });

    const { data, error } = await supabase
      .from('invoice_items')
      .update({
        ...itemData,
        subtotal,
        discount_amount: discountAmount,
        amount,
      })
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;

    // Recalculate invoice totals
    if (data) {
      await this.recalculateInvoice(supabase, userId, data.invoice_id);
    }

    return data;
  }

  async deleteInvoiceItem(supabase: SupabaseClient, userId: string, itemId: string): Promise<void> {
    // Get invoice_id before deleting
    const { data: item } = await supabase
      .from('invoice_items')
      .select('invoice_id')
      .eq('id', itemId)
      .single();

    const { error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    // Recalculate invoice totals
    if (item) {
      await this.recalculateInvoice(supabase, userId, item.invoice_id);
    }
  }

  async recalculateInvoice(supabase: SupabaseClient, userId: string, invoiceId: string): Promise<Invoice> {
    const invoice = await this.findOne(supabase, userId, invoiceId);
    const items = await this.findInvoiceItems(supabase, userId, invoiceId);

    const { subtotal, taxAmount, totalAmount, amountDue } = this.calculateInvoiceTotals(
      items,
      invoice.tax_rate,
      invoice.discount_amount
    );

    const actualAmountDue = totalAmount - invoice.amount_paid;

    const { data, error } = await supabase
      .from('invoices')
      .update({
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        amount_due: actualAmountDue,
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(supabase: SupabaseClient, userId: string, id: string, invoiceData: Partial<Invoice>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .update(invoiceData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Recalculate if tax_rate or discount_amount changed
    if (invoiceData.tax_rate !== undefined || invoiceData.discount_amount !== undefined) {
      return this.recalculateInvoice(supabase, userId, id);
    }

    return data;
  }

  async updateStatus(supabase: SupabaseClient, userId: string, id: string, status: string): Promise<Invoice> {
    const updateData: any = { status };
    
    if (status === 'sent' && !updateData.issue_date) {
      updateData.issue_date = new Date().toISOString().split('T')[0];
    }
    
    if (status === 'paid') {
      updateData.paid_date = new Date().toISOString().split('T')[0];
    }

    return this.update(supabase, userId, id, updateData);
  }

  async recordPayment(supabase: SupabaseClient, userId: string, id: string, amount: number): Promise<Invoice> {
    const invoice = await this.findOne(supabase, userId, id);
    const newAmountPaid = Number(invoice.amount_paid) + amount;
    
    const updateData: any = { amount_paid: newAmountPaid };
    
    if (newAmountPaid >= invoice.total_amount) {
      updateData.status = 'paid';
      updateData.paid_date = new Date().toISOString().split('T')[0];
    }

    return this.update(supabase, userId, id, updateData);
  }

  async delete(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async createQuoteFromIntakeForm(supabase: SupabaseClient, userId: string, intakeFormId: string): Promise<Invoice> {
    const issueDate = new Date().toISOString().split('T')[0];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    return this.create(supabase, userId, {
      intake_form_id: intakeFormId,
      owner_id: userId,
      status: 'draft',
      issue_date: issueDate,
      due_date: dueDate.toISOString().split('T')[0],
      tax_rate: 0,
      discount_amount: 0,
      amount_paid: 0,
      terms: 'Payment due within 30 days of acceptance',
      notes: 'This is a quote for your event. Once accepted, it will be converted to an invoice.',
    });
  }
}
