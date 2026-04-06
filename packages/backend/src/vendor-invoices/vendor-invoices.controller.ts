import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { VendorInvoicesService } from './vendor-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateVendorInvoiceDto, UpdateVendorInvoiceDto, VendorInvoiceItemDto } from './dto/vendor-invoice.dto';

@Controller('vendor-invoices')
export class VendorInvoicesController {
  private readonly logger = new Logger(VendorInvoicesController.name);

  constructor(
    private readonly vendorInvoicesService: VendorInvoicesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ─── Auth helpers ────────────────────────────────────────────────────────────

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');

    if (token.startsWith('local-')) return token.replace('local-', '');

    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  private async getOwnerAccountId(userId: string): Promise<string | null> {
    const admin = this.supabaseService.getAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();
    if (membership?.owner_account_id) return membership.owner_account_id;

    const { data: ownerAccount } = await admin
      .from('owner_accounts')
      .select('id')
      .eq('primary_owner_id', userId)
      .single();
    return ownerAccount?.id || null;
  }

  // ─── PUBLIC routes (no auth) ─────────────────────────────────────────────────

  /** GET /vendor-invoices/public/:token — External client views their invoice */
  @Get('public/:token')
  async getPublicInvoice(@Param('token') token: string) {
    return this.vendorInvoicesService.getPublicInvoice(token);
  }

  /** POST /vendor-invoices/public/:token/checkout — External client initiates payment */
  @Post('public/:token/checkout')
  async createPublicCheckout(@Param('token') token: string) {
    return this.vendorInvoicesService.createCheckoutSession(token);
  }

  /** POST /vendor-invoices/public/:token/verify-payment — Verify Stripe session and mark paid (webhook fallback) */
  @Post('public/:token/verify-payment')
  async verifyPayment(@Param('token') token: string) {
    return this.vendorInvoicesService.verifyPayment(token);
  }

  // ─── AUTHENTICATED routes ────────────────────────────────────────────────────

  /** POST /vendor-invoices — Create a new invoice */
  @Post()
  async createInvoice(
    @Headers('authorization') auth: string,
    @Body() dto: CreateVendorInvoiceDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.vendorInvoicesService.createInvoice(userId, dto);
  }

  /** GET /vendor-invoices/mine — List all invoices for this vendor */
  @Get('mine')
  async listInvoices(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    return this.vendorInvoicesService.listInvoices(userId);
  }

  /** GET /vendor-invoices/owner-bookings — Owner sees invoices they owe vendors */
  @Get('owner-bookings')
  async listOwnerBookingInvoices(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    const ownerAccountId = await this.getOwnerAccountId(userId);
    if (!ownerAccountId) throw new UnauthorizedException('Not an owner account');
    return this.vendorInvoicesService.listOwnerBookingInvoices(ownerAccountId, userId);
  }

  /** GET /vendor-invoices/owner/:id — Owner views a specific vendor invoice they owe */
  @Get('owner/:id')
  async getInvoiceAsOwner(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(auth);
    const ownerAccountId = await this.getOwnerAccountId(userId);
    if (!ownerAccountId) throw new UnauthorizedException('Not an owner account');
    return this.vendorInvoicesService.getInvoiceAsOwner(ownerAccountId, id);
  }

  /** GET /vendor-invoices/:id — Get single invoice (vendor or owner fallback) */
  @Get(':id')
  async getInvoice(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(auth);
    try {
      return await this.vendorInvoicesService.getInvoice(userId, id);
    } catch (e: any) {
      // Not a vendor — try owner route so owners can view any vendor invoice
      if (e?.status === 403 || e?.constructor?.name === 'ForbiddenException') {
        const ownerAccountId = await this.getOwnerAccountId(userId);
        if (!ownerAccountId) throw e;
        return this.vendorInvoicesService.getInvoiceAsOwner(ownerAccountId, id);
      }
      throw e;
    }
  }

  /** PUT /vendor-invoices/:id — Update invoice metadata */
  @Put(':id')
  async updateInvoice(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdateVendorInvoiceDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.vendorInvoicesService.updateInvoice(userId, id, dto);
  }

  /** DELETE /vendor-invoices/:id — Delete invoice */
  @Delete(':id')
  async deleteInvoice(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.vendorInvoicesService.deleteInvoice(userId, id);
  }

  /** POST /vendor-invoices/:id/send — Email invoice to client */
  @Post(':id/send')
  async sendInvoice(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.vendorInvoicesService.sendInvoice(userId, id);
  }

  /** POST /vendor-invoices/:id/items — Add a line item */
  @Post(':id/items')
  async addItem(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() item: VendorInvoiceItemDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.vendorInvoicesService.addItem(userId, id, item);
  }

  /** PUT /vendor-invoices/items/:itemId — Update a line item */
  @Put('items/:itemId')
  async updateItem(
    @Headers('authorization') auth: string,
    @Param('itemId') itemId: string,
    @Body() item: Partial<VendorInvoiceItemDto>,
  ) {
    const userId = await this.getUserId(auth);
    return this.vendorInvoicesService.updateItem(userId, itemId, item);
  }

  /** DELETE /vendor-invoices/items/:itemId — Delete a line item */
  @Delete('items/:itemId')
  async deleteItem(
    @Headers('authorization') auth: string,
    @Param('itemId') itemId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.vendorInvoicesService.deleteItem(userId, itemId);
  }
}
