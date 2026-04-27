import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { InvoicesService, Invoice, InvoiceItem } from './invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly supabaseService: SupabaseService,
    private readonly smsService: SmsNotificationsService,
  ) {}

  /** Resolve an authenticated Supabase client from the Bearer token, falling back to anon. */
  private getSupabase(authHeader?: string) {
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '').trim();
      if (token) return this.supabaseService.setAuthContext(token);
    }
    return this.supabaseService.getClient();
  }

  @Get()
  async findAll(
    @Headers('authorization') auth: string,
    @Query('ownerId') ownerId?: string,
    @Query('venueId') venueId?: string,
  ): Promise<Invoice[]> {
    const supabase = this.getSupabase(auth);
    if (ownerId) {
      return this.invoicesService.findByOwner(supabase, ownerId, venueId);
    }
    return this.invoicesService.findAll(supabase);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ): Promise<Invoice | null> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.findOne(supabase, id);
  }

  @Post()
  async create(
    @Headers('authorization') auth: string,
    @Body() body: { invoice?: Partial<Invoice>; items?: any[] } & Partial<Invoice>,
  ): Promise<Invoice> {
    const supabase = this.getSupabase(auth);

    // Support both wrapped `{ invoice, items }` and flat body formats
    const invoiceData: Partial<Invoice> = body.invoice ?? body;
    const rawItems: any[] = body.items ?? [];

    // Compute subtotal from items so totals are accurate
    const computedSubtotal = rawItems.reduce((sum: number, it: any) => {
      return sum + (Number(it.unit_price) || 0) * (Number(it.quantity) || 1);
    }, 0);
    invoiceData.subtotal = computedSubtotal;

    const created = await this.invoicesService.create(supabase, invoiceData);

    // Insert line items linked to the new invoice
    if (rawItems.length > 0) {
      const itemRows = rawItems.map((it: any) => ({
        invoice_id: created.id,
        service_item_id: it.service_item_id || null,
        description: it.description || '',
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        amount: (Number(it.unit_price) || 0) * (Number(it.quantity) || 1),
        discount_type: it.discount_type || 'none',
        discount_value: Number(it.discount_value) || 0,
        sort_order: it.sort_order ?? 0,
        item_type: it.item_type || 'revenue',
        vendor_booking_id: it.vendor_booking_id || null,
      }));
      await supabase.from('invoice_items').insert(itemRows);
    }

    return created;
  }

  @Put(':id/status')
  async updateStatus(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ): Promise<Invoice | null> {
    const supabase = this.getSupabase(auth);
    const updated = await this.invoicesService.update(supabase, id, { status: status as Invoice['status'] });
    if (status === 'sent' && updated) {
      const phone = updated.client_phone;
      const name = updated.client_name || 'Valued Client';
      await this.smsService.invoiceSent(phone, name, updated.invoice_number!, updated.total_amount);
    }
    return updated;
  }

  @Put(':id')
  async update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() invoice: Partial<Invoice>,
  ): Promise<Invoice | null> {
    const supabase = this.getSupabase(auth);
    // Fetch current invoice so we know if it's already sent before we save edits
    const existing = await this.invoicesService.findOne(supabase, id);
    const updated = await this.invoicesService.update(supabase, id, invoice);
    // Notify client when an already-sent invoice is edited
    if (existing?.status === 'sent' && updated) {
      const phone = updated.client_phone || existing.client_phone;
      const name = updated.client_name || existing.client_name || 'Valued Client';
      await this.smsService.invoiceUpdated(phone, name, updated.invoice_number!);
    }
    return updated;
  }

  @Post(':id/payment')
  async recordPayment(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body('amount') amount: number,
  ): Promise<Invoice | null> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.recordPayment(supabase, id, amount);
  }

  @Delete(':id')
  async delete(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ): Promise<void> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.delete(supabase, id);
  }

  // Invoice Items
  @Get(':invoiceId/items')
  async getItems(
    @Headers('authorization') auth: string,
    @Param('invoiceId') invoiceId: string,
  ): Promise<InvoiceItem[]> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.getItems(supabase, invoiceId);
  }

  @Post(':invoiceId/items')
  async addItem(
    @Headers('authorization') auth: string,
    @Param('invoiceId') invoiceId: string,
    @Body() item: Partial<InvoiceItem>,
  ): Promise<InvoiceItem> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.addItem(supabase, { ...item, invoice_id: invoiceId });
  }

  @Put('items/:id')
  async updateItem(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() item: Partial<InvoiceItem>,
  ): Promise<InvoiceItem | null> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.updateItem(supabase, id, item);
  }

  @Delete('items/:id')
  async deleteItem(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ): Promise<void> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.deleteItem(supabase, id);
  }
}
