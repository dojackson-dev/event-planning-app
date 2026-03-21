import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { InvoicesService, Invoice, InvoiceItem } from './invoices.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly supabaseService: SupabaseService,
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
  ): Promise<Invoice[]> {
    const supabase = this.getSupabase(auth);
    if (ownerId) {
      return this.invoicesService.findByOwner(supabase, ownerId);
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
    @Body() invoice: Partial<Invoice>,
  ): Promise<Invoice> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.create(supabase, invoice);
  }

  @Put(':id')
  async update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() invoice: Partial<Invoice>,
  ): Promise<Invoice | null> {
    const supabase = this.getSupabase(auth);
    return this.invoicesService.update(supabase, id, invoice);
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
