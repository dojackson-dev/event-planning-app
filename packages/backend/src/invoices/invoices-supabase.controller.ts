import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException, Query, ParseIntPipe } from '@nestjs/common';
import { InvoicesService, Invoice, InvoiceItem } from './invoices-supabase.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('invoices')
export class InvoicesSupabaseController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private async getUserId(authorization: string): Promise<string> {
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabaseWithAuth.auth.getUser(token);
    
    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    
    return user.id;
  }

  @Get()
  async findAll(
    @Headers('authorization') authorization: string,
    @Query('ownerId') ownerId?: string,
    @Query('intakeFormId') intakeFormId?: string,
  ): Promise<Invoice[]> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);

    if (ownerId) {
      return this.invoicesService.findByOwner(supabaseWithAuth, userId, ownerId);
    }
    
    if (intakeFormId) {
      return this.invoicesService.findByIntakeForm(supabaseWithAuth, userId, intakeFormId);
    }

    return this.invoicesService.findAll(supabaseWithAuth, userId);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<Invoice> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.findOne(supabaseWithAuth, userId, id);
  }

  @Get(':id/items')
  async findInvoiceItems(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<InvoiceItem[]> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.findInvoiceItems(supabaseWithAuth, userId, id);
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() body: { invoice: Partial<Invoice>, items?: Partial<InvoiceItem>[] },
  ): Promise<Invoice> {
    const userId = await this.getUserId(authorization);
    // WORKAROUND: Use admin client to bypass PostgREST schema cache issue
    // PostgREST cache thinks columns are camelCase but database has snake_case
    const supabaseAdmin = this.supabaseService.getAdminClient();
    return this.invoicesService.create(supabaseAdmin, userId, body.invoice, body.items);
  }

  @Post('quote/intake-form/:intakeFormId')
  async createQuoteFromIntakeForm(
    @Headers('authorization') authorization: string,
    @Param('intakeFormId') intakeFormId: string,
  ): Promise<Invoice> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.createQuoteFromIntakeForm(supabaseWithAuth, userId, intakeFormId);
  }

  @Post(':id/items')
  async addItems(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() items: Partial<InvoiceItem>[],
  ): Promise<InvoiceItem[]> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.createInvoiceItems(supabaseWithAuth, userId, id, items);
  }

  @Post(':id/items/service-item/:serviceItemId')
  async addItemFromServiceItem(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Param('serviceItemId') serviceItemId: string,
    @Body('quantity') quantity?: number,
  ): Promise<InvoiceItem> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.addItemFromServiceItem(supabaseWithAuth, userId, id, serviceItemId, quantity || 1);
  }

  @Put(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() invoice: Partial<Invoice>,
  ): Promise<Invoice> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.update(supabaseWithAuth, userId, id, invoice);
  }

  @Put(':id/status')
  async updateStatus(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ): Promise<Invoice> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.updateStatus(supabaseWithAuth, userId, id, status);
  }

  @Put('items/:itemId')
  async updateInvoiceItem(
    @Headers('authorization') authorization: string,
    @Param('itemId') itemId: string,
    @Body() item: Partial<InvoiceItem>,
  ): Promise<InvoiceItem> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.updateInvoiceItem(supabaseWithAuth, userId, itemId, item);
  }

  @Post(':id/payment')
  async recordPayment(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body('amount') amount: number,
  ): Promise<Invoice> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.recordPayment(supabaseWithAuth, userId, id, amount);
  }

  @Delete(':id')
  async delete(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<void> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.delete(supabaseWithAuth, userId, id);
  }

  @Delete('items/:itemId')
  async deleteInvoiceItem(
    @Headers('authorization') authorization: string,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.invoicesService.deleteInvoiceItem(supabaseWithAuth, userId, itemId);
  }
}
