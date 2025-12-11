import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface Invoice {
  id?: string;
  invoice_number?: string;
  owner_id: string;
  booking_id?: string;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_due: number;
  notes?: string;
  terms?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  created_at?: string;
}

@Injectable()
export class InvoicesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(supabase: any): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByOwner(supabase: any, ownerId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findOne(supabase: any, id: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async create(supabase: any, invoice: Partial<Invoice>): Promise<Invoice> {
    // Generate invoice number
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(5, '0')}`;

    // Calculate totals
    const subtotal = Number(invoice.subtotal) || 0;
    const taxRate = Number(invoice.tax_rate) || 0;
    const discountAmount = Number(invoice.discount_amount) || 0;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount - discountAmount;
    const amountPaid = Number(invoice.amount_paid) || 0;
    const amountDue = totalAmount - amountPaid;

    const invoiceData = {
      ...invoice,
      invoice_number: invoiceNumber,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      amount_paid: amountPaid,
      amount_due: amountDue,
      status: invoice.status || 'draft',
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(supabase: any, id: string, invoice: Partial<Invoice>): Promise<Invoice | null> {
    // Recalculate totals if needed
    if (invoice.subtotal !== undefined || invoice.tax_rate !== undefined || invoice.discount_amount !== undefined) {
      const existing = await this.findOne(supabase, id);
      if (!existing) return null;

      const subtotal = invoice.subtotal !== undefined ? Number(invoice.subtotal) : existing.subtotal;
      const taxRate = invoice.tax_rate !== undefined ? Number(invoice.tax_rate) : existing.tax_rate;
      const discountAmount = invoice.discount_amount !== undefined ? Number(invoice.discount_amount) : existing.discount_amount;
      const taxAmount = (subtotal * taxRate) / 100;
      const totalAmount = subtotal + taxAmount - discountAmount;
      const amountPaid = invoice.amount_paid !== undefined ? Number(invoice.amount_paid) : existing.amount_paid;
      const amountDue = totalAmount - amountPaid;

      invoice = {
        ...invoice,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        amount_due: amountDue,
      };
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(invoice)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async recordPayment(supabase: any, id: string, amount: number): Promise<Invoice | null> {
    const invoice = await this.findOne(supabase, id);
    if (!invoice) return null;

    const prevAmountPaid = Number(invoice.amount_paid || 0);
    const amountPaid = prevAmountPaid + amount;
    const amountDue = invoice.total_amount - amountPaid;
    const status = amountDue <= 0 ? 'paid' : invoice.status;

    const updated = await this.update(supabase, id, { amount_paid: amountPaid, amount_due: amountDue, status });

    // Try to create a message record in the 'messages' table (if present in the DB)
    try {
      // Fetch booking to get deposit amount and user_id
      const { data: booking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', invoice.booking_id)
        .single();

      // Fetch user to get phone and name
      let user: any = null;
      if (booking?.user_id) {
        const { data: u } = await supabase
          .from('users')
          .select('*')
          .eq('id', booking.user_id)
          .single();
        user = u;
      }

      const prevStatus = invoice.status;

      // Deposit notification: if deposit exists and this payment crossed that threshold
      const depositAmount = Number(booking?.deposit || 0);
      if (depositAmount > 0 && prevAmountPaid < depositAmount && amountPaid >= depositAmount) {
        const msg = `Deposit of $${depositAmount.toFixed(2)} received for booking (invoice ${updated?.invoice_number || id}).`;
        await supabase.from('messages').insert([{
          recipient_phone: user?.phone || null,
          recipient_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : null,
          recipient_type: 'client',
          user_id: user?.id || null,
          event_id: booking?.event_id || null,
          message_type: 'invoice',
          content: msg,
          status: 'pending',
        }]);
      }

      // Invoice fully paid notification
      if (status === 'paid' && prevStatus !== 'paid') {
        const msg = `Your invoice ${updated?.invoice_number || id} has been paid in full. Thank you!`;
        await supabase.from('messages').insert([{
          recipient_phone: user?.phone || null,
          recipient_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : null,
          recipient_type: 'client',
          user_id: user?.id || null,
          event_id: booking?.event_id || null,
          message_type: 'invoice',
          content: msg,
          status: 'pending',
        }]);
      }
    } catch (err) {
      console.error('Failed to create supabase message record for payment notification:', err?.message || err);
    }

    return updated;
  }

  async delete(supabase: any, id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Invoice Items
  async getItems(supabase: any, invoiceId: string): Promise<InvoiceItem[]> {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async addItem(supabase: any, item: Partial<InvoiceItem>): Promise<InvoiceItem> {
    const { data, error } = await supabase
      .from('invoice_items')
      .insert(item)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateItem(supabase: any, id: string, item: Partial<InvoiceItem>): Promise<InvoiceItem | null> {
    const { data, error } = await supabase
      .from('invoice_items')
      .update(item)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  }

  async deleteItem(supabase: any, id: string): Promise<void> {
    const { error } = await supabase
      .from('invoice_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}
