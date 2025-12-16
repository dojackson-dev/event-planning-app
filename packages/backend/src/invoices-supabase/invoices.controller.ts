import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { InvoicesService, Invoice, InvoiceItem } from './invoices.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('invoices')
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  @Get()
  async findAll(@Query('ownerId') ownerId?: string): Promise<Invoice[]> {
    const supabase = this.supabaseService.getClient();
    
    if (ownerId) {
      return this.invoicesService.findByOwner(supabase, ownerId);
    }
    return this.invoicesService.findAll(supabase);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Invoice | null> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.findOne(supabase, id);
  }

  @Post()
  async create(@Body() invoice: Partial<Invoice>): Promise<Invoice> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.create(supabase, invoice);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() invoice: Partial<Invoice>,
  ): Promise<Invoice | null> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.update(supabase, id, invoice);
  }

  @Post(':id/payment')
  async recordPayment(
    @Param('id') id: string,
    @Body('amount') amount: number,
  ): Promise<Invoice | null> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.recordPayment(supabase, id, amount);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.delete(supabase, id);
  }

  // Invoice Items
  @Get(':invoiceId/items')
  async getItems(@Param('invoiceId') invoiceId: string): Promise<InvoiceItem[]> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.getItems(supabase, invoiceId);
  }

  @Post(':invoiceId/items')
  async addItem(@Param('invoiceId') invoiceId: string, @Body() item: Partial<InvoiceItem>): Promise<InvoiceItem> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.addItem(supabase, { ...item, invoice_id: invoiceId });
  }

  @Put('items/:id')
  async updateItem(@Param('id') id: string, @Body() item: Partial<InvoiceItem>): Promise<InvoiceItem | null> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.updateItem(supabase, id, item);
  }

  @Delete('items/:id')
  async deleteItem(@Param('id') id: string): Promise<void> {
    const supabase = this.supabaseService.getClient();
    return this.invoicesService.deleteItem(supabase, id);
  }
}
