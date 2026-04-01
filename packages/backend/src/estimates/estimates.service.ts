import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

export interface Estimate {
  id?: string;
  estimate_number: string;
  owner_id?: string;
  booking_id?: string;
  intake_form_id?: string;
  created_by?: string;
  client_phone?: string;
  client_email?: string;
  subtotal: number;
  tax_amount: number;
  tax_rate: number;
  discount_amount: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted';
  issue_date: string;
  expiration_date: string;
  approved_date?: string;
  rejected_date?: string;
  converted_invoice_id?: string;
  converted_at?: string;
  notes?: string;
  terms?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EstimateItem {
  id?: string;
  estimate_id: string;
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
export class EstimatesService {
  constructor(private readonly smsNotifications: SmsNotificationsService) {}

  /**
   * Look up the client phone + email from an estimate's linked booking or intake form.
   * Also persists them back onto the estimate row for future lookup.
   */
  private async lookupAndPersistClientContact(
    supabase: SupabaseClient,
    estimate: Estimate,
  ): Promise<{ phone: string | null; email: string | null }> {
    // Already stored directly — use it
    if ((estimate as any).client_phone) {
      return { phone: (estimate as any).client_phone, email: (estimate as any).client_email ?? null };
    }

    let phone: string | null = null;
    let email: string | null = null;

    if ((estimate as any).booking_id) {
      const { data: booking } = await supabase
        .from('booking')
        .select('contact_phone, contact_email')
        .eq('id', (estimate as any).booking_id)
        .single();
      phone = (booking as any)?.contact_phone ?? null;
      email = (booking as any)?.contact_email ?? null;
    }

    if (!phone && (estimate as any).intake_form_id) {
      const { data: form } = await supabase
        .from('intake_forms')
        .select('contact_phone, contact_email')
        .eq('id', (estimate as any).intake_form_id)
        .single();
      phone = (form as any)?.contact_phone ?? null;
      email = (form as any)?.contact_email ?? null;
    }

    // Persist for next time so client portal can query directly
    if (phone && estimate.id) {
      await supabase
        .from('estimates')
        .update({ client_phone: phone, client_email: email })
        .eq('id', estimate.id)
        .then(() => {}); // fire-and-forget
    }

    return { phone, email };
  }

  private async lookupOwnerPhone(
    supabase: SupabaseClient,
    ownerId: string,
  ): Promise<string | null> {
    try {
      const { data } = await supabase
        .from('users')
        .select('phone')
        .eq('id', ownerId)
        .single();
      return (data as any)?.phone ?? null;
    } catch {
      return null;
    }
  }

  private calculateTotals(items: Partial<EstimateItem>[], taxRate: number, discountAmount: number) {
    const subtotal = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount - discountAmount;
    return { subtotal, taxAmount, totalAmount };
  }

  private calculateItemAmounts(item: Partial<EstimateItem>) {
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

  // ─── Finders ────────────────────────────────────────────────────────────────

  async findAll(supabase: SupabaseClient, userId: string): Promise<Estimate[]> {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select('*, booking:booking(id, contact_name, contact_email, contact_phone, event_id, total_amount), intake_form:intake_forms(*), items:estimate_items(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  async findByOwner(supabase: SupabaseClient, ownerId: string): Promise<Estimate[]> {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select('*, booking:booking(id, contact_name, contact_email, contact_phone, event_id, total_amount), intake_form:intake_forms(*), items:estimate_items(*)')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  async findByIntakeForm(supabase: SupabaseClient, intakeFormId: string): Promise<Estimate[]> {
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select('*, items:estimate_items(*)')
        .eq('intake_form_id', intakeFormId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch {
      return [];
    }
  }

  async findOne(supabase: SupabaseClient, id: string): Promise<Estimate> {
    const { data, error } = await supabase
      .from('estimates')
      .select('*, booking:booking(id, contact_name, contact_email, contact_phone, event_id, total_amount), intake_form:intake_forms(*), items:estimate_items(*)')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Estimate not found');
    return data;
  }

  // ─── Create ──────────────────────────────────────────────────────────────────

  async create(
    supabase: SupabaseClient,
    userId: string,
    estimateData: Partial<Estimate>,
    items?: Partial<EstimateItem>[],
  ): Promise<Estimate> {
    const ownerId = estimateData.owner_id || userId;

    // Generate estimate number
    const { data: latest } = await supabase
      .from('estimates')
      .select('estimate_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNumber = 1;
    if (latest?.estimate_number) {
      const match = latest.estimate_number.match(/EST-\d{4}-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }
    const estimateNumber = `EST-${new Date().getFullYear()}-${String(nextNumber).padStart(5, '0')}`;

    const { subtotal, taxAmount, totalAmount } = this.calculateTotals(
      items || [],
      Number(estimateData.tax_rate) || 0,
      Number(estimateData.discount_amount) || 0,
    );

    // Resolve client contact info from booking or intake form
    let clientPhone: string | null = estimateData.client_phone || null;
    let clientEmail: string | null = estimateData.client_email || null;
    if (!clientPhone && estimateData.booking_id) {
      const { data: bk } = await supabase.from('booking').select('contact_phone, contact_email').eq('id', estimateData.booking_id).single();
      clientPhone = (bk as any)?.contact_phone ?? null;
      clientEmail = (bk as any)?.contact_email ?? null;
    }
    if (!clientPhone && estimateData.intake_form_id) {
      const { data: fm } = await supabase.from('intake_forms').select('contact_phone, contact_email').eq('id', estimateData.intake_form_id).single();
      clientPhone = (fm as any)?.contact_phone ?? null;
      clientEmail = (fm as any)?.contact_email ?? null;
    }

    const { data, error } = await supabase
      .from('estimates')
      .insert({
        estimate_number: estimateNumber,
        owner_id: ownerId,
        created_by: userId,
        booking_id: estimateData.booking_id || null,
        intake_form_id: estimateData.intake_form_id || null,
        client_phone: clientPhone,
        client_email: clientEmail,
        subtotal,
        tax_rate: Number(estimateData.tax_rate) || 0,
        tax_amount: taxAmount,
        discount_amount: Number(estimateData.discount_amount) || 0,
        total_amount: totalAmount,
        status: estimateData.status || 'draft',
        issue_date: estimateData.issue_date,
        expiration_date: estimateData.expiration_date,
        notes: estimateData.notes || null,
        terms: estimateData.terms || null,
      })
      .select()
      .single();

    if (error) throw error;
    const estimate = data as Estimate;

    if (items && items.length > 0) {
      const createdItems = await this.createItems(supabase, estimate.id!, items);
      const totals = this.calculateTotals(
        createdItems,
        Number(estimateData.tax_rate) || 0,
        Number(estimateData.discount_amount) || 0,
      );
      const { data: updated, error: upErr } = await supabase
        .from('estimates')
        .update({ subtotal: totals.subtotal, tax_amount: totals.taxAmount, total_amount: totals.totalAmount })
        .eq('id', estimate.id)
        .select('*, booking:booking(id, contact_name, contact_email, contact_phone, event_id, total_amount), intake_form:intake_forms(*), items:estimate_items(*)')
        .single();
      if (upErr) throw upErr;
      return updated;
    }

    return estimate;
  }

  async createItems(
    supabase: SupabaseClient,
    estimateId: string,
    items: Partial<EstimateItem>[],
  ): Promise<EstimateItem[]> {
    const rows = items.map((item, index) => {
      const { subtotal, discountAmount, amount } = this.calculateItemAmounts(item);
      return {
        estimate_id: estimateId,
        service_item_id: item.service_item_id || null,
        description: item.description || '',
        quantity: item.quantity || 1,
        standard_price: item.standard_price || item.unit_price || 0,
        unit_price: item.unit_price || 0,
        subtotal,
        discount_type: item.discount_type || 'none',
        discount_value: item.discount_value || 0,
        discount_amount: discountAmount,
        amount,
        sort_order: item.sort_order ?? index,
      };
    });

    const { data, error } = await supabase.from('estimate_items').insert(rows).select();
    if (error) throw error;
    return data || [];
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  async update(supabase: SupabaseClient, id: string, estimateData: Partial<Estimate>): Promise<Estimate> {
    const { data, error } = await supabase
      .from('estimates')
      .update(estimateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    if (estimateData.tax_rate !== undefined || estimateData.discount_amount !== undefined) {
      return this.recalculate(supabase, id);
    }
    return data;
  }

  async updateStatus(supabase: SupabaseClient, id: string, status: string): Promise<Estimate> {
    const updateData: any = { status };
    const today = new Date().toISOString().split('T')[0];
    if (status === 'approved') updateData.approved_date = today;
    if (status === 'rejected') updateData.rejected_date = today;

    const updated = await this.update(supabase, id, updateData);

    // ── Persist client contact + SMS notifications ──────────────────────────
    try {
      const { phone } = await this.lookupAndPersistClientContact(supabase, updated);
      const clientName =
        (updated as any).booking?.contact_name || 'Valued Client';
      if (status === 'sent') {
        await this.smsNotifications.estimateSent(
          phone,
          clientName,
          updated.estimate_number,
          updated.total_amount,
        );
      } else if (status === 'rejected') {
        await this.smsNotifications.estimateRejected(
          phone,
          clientName,
          updated.estimate_number,
        );
      } else if (status === 'expired') {
        await this.smsNotifications.estimateExpired(
          phone,
          clientName,
          updated.estimate_number,
        );
      } else if (status === 'approved') {
        const ownerPhone = await this.lookupOwnerPhone(supabase, updated.owner_id!);
        await this.smsNotifications.estimateApproved(
          ownerPhone,
          clientName,
          updated.estimate_number,
        );
      }
    } catch {
      // SMS errors must never break the estimate update
    }

    return updated;
  }

  async updateItem(supabase: SupabaseClient, itemId: string, itemData: Partial<EstimateItem>): Promise<EstimateItem> {
    const { subtotal, discountAmount, amount } = this.calculateItemAmounts({ ...itemData });
    const { data, error } = await supabase
      .from('estimate_items')
      .update({ ...itemData, subtotal, discount_amount: discountAmount, amount })
      .eq('id', itemId)
      .select()
      .single();
    if (error) throw error;
    if (data) await this.recalculate(supabase, data.estimate_id);
    return data;
  }

  async deleteItem(supabase: SupabaseClient, itemId: string): Promise<void> {
    const { data: item } = await supabase.from('estimate_items').select('estimate_id').eq('id', itemId).single();
    const { error } = await supabase.from('estimate_items').delete().eq('id', itemId);
    if (error) throw error;
    if (item) await this.recalculate(supabase, item.estimate_id);
  }

  async recalculate(supabase: SupabaseClient, estimateId: string): Promise<Estimate> {
    const estimate = await this.findOne(supabase, estimateId);
    const { subtotal, taxAmount, totalAmount } = this.calculateTotals(
      (estimate as any).items || [],
      estimate.tax_rate,
      estimate.discount_amount,
    );
    const { data, error } = await supabase
      .from('estimates')
      .update({ subtotal, tax_amount: taxAmount, total_amount: totalAmount })
      .eq('id', estimateId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ─── Delete ──────────────────────────────────────────────────────────────────

  async delete(supabase: SupabaseClient, id: string): Promise<void> {
    const { error } = await supabase.from('estimates').delete().eq('id', id);
    if (error) throw error;
  }

  // ─── Convert to Invoice ──────────────────────────────────────────────────────

  async convertToInvoice(supabase: SupabaseClient, userId: string, estimateId: string): Promise<any> {
    const estimate = await this.findOne(supabase, estimateId);
    const items: EstimateItem[] = (estimate as any).items || [];

    // Generate invoice number
    const { data: latestInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextNum = 1;
    if (latestInvoice?.invoice_number) {
      const m = latestInvoice.invoice_number.match(/INV-\d{4}-(\d+)/);
      if (m) nextNum = parseInt(m[1], 10) + 1;
    }
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNum).padStart(5, '0')}`;

    // Due date = 30 days from today
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        owner_id: estimate.owner_id,
        created_by: userId,
        booking_id: estimate.booking_id || null,
        intake_form_id: estimate.intake_form_id || null,
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        discount_amount: estimate.discount_amount,
        total_amount: estimate.total_amount,
        amount_paid: 0,
        amount_due: estimate.total_amount,
        status: 'draft',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        notes: estimate.notes || null,
        terms: estimate.terms || null,
      })
      .select()
      .single();

    if (invErr) throw invErr;

    // Copy estimate items → invoice_items
    if (items.length > 0) {
      const invoiceItems = items.map((item) => ({
        invoice_id: invoice.id,
        service_item_id: item.service_item_id || null,
        description: item.description,
        quantity: item.quantity,
        standard_price: item.standard_price,
        unit_price: item.unit_price,
        subtotal: item.subtotal,
        discount_type: item.discount_type,
        discount_value: item.discount_value,
        discount_amount: item.discount_amount,
        amount: item.amount,
        sort_order: item.sort_order,
      }));
      const { error: itemErr } = await supabase.from('invoice_items').insert(invoiceItems);
      if (itemErr) throw itemErr;
    }

    // Update estimate → converted
    await supabase.from('estimates').update({
      status: 'converted',
      converted_invoice_id: invoice.id,
      converted_at: new Date().toISOString(),
    }).eq('id', estimateId);

    return invoice;
  }
}
