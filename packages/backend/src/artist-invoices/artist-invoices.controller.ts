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
import { ArtistInvoicesService } from './artist-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateArtistInvoiceDto,
  UpdateArtistInvoiceDto,
  ArtistInvoiceItemDto,
} from './dto/artist-invoice.dto';

@Controller('artist-invoices')
export class ArtistInvoicesController {
  private readonly logger = new Logger(ArtistInvoicesController.name);

  constructor(
    private readonly artistInvoicesService: ArtistInvoicesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ─── Auth helper ──────────────────────────────────────────────────────────

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');

    if (token.startsWith('local-')) return token.replace('local-', '');

    const supabase = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ─── PUBLIC routes (no auth) ──────────────────────────────────────────────

  /** GET /artist-invoices/public/:token — External client views their invoice */
  @Get('public/:token')
  async getPublicInvoice(@Param('token') token: string) {
    return this.artistInvoicesService.getPublicInvoice(token);
  }

  /** POST /artist-invoices/public/:token/checkout — External client initiates payment */
  @Post('public/:token/checkout')
  async createPublicCheckout(@Param('token') token: string) {
    return this.artistInvoicesService.createCheckoutSession(token);
  }

  /** POST /artist-invoices/public/:token/verify-payment — Verify Stripe session and mark paid */
  @Post('public/:token/verify-payment')
  async verifyPayment(@Param('token') token: string) {
    return this.artistInvoicesService.verifyPayment(token);
  }

  // ─── AUTHENTICATED routes ──────────────────────────────────────────────────

  /** POST /artist-invoices — Create a new invoice */
  @Post()
  async createInvoice(
    @Headers('authorization') auth: string,
    @Body() dto: CreateArtistInvoiceDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.createInvoice(userId, dto);
  }

  /** GET /artist-invoices/mine — List all invoices for this artist */
  @Get('mine')
  async listInvoices(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.listInvoices(userId);
  }

  /** GET /artist-invoices/:id — Get single invoice */
  @Get(':id')
  async getInvoice(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.getInvoice(userId, id);
  }

  /** PUT /artist-invoices/:id — Update invoice metadata */
  @Put(':id')
  async updateInvoice(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdateArtistInvoiceDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.updateInvoice(userId, id, dto);
  }

  /** DELETE /artist-invoices/:id — Delete invoice */
  @Delete(':id')
  async deleteInvoice(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.deleteInvoice(userId, id);
  }

  /** POST /artist-invoices/:id/send — Email invoice to client */
  @Post(':id/send')
  async sendInvoice(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.sendInvoice(userId, id);
  }

  /** POST /artist-invoices/:id/items — Add a line item */
  @Post(':id/items')
  async addItem(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() item: ArtistInvoiceItemDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.addItem(userId, id, item);
  }

  /** PUT /artist-invoices/items/:itemId — Update a line item */
  @Put('items/:itemId')
  async updateItem(
    @Headers('authorization') auth: string,
    @Param('itemId') itemId: string,
    @Body() item: Partial<ArtistInvoiceItemDto>,
  ) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.updateItem(userId, itemId, item);
  }

  /** DELETE /artist-invoices/items/:itemId — Delete a line item */
  @Delete('items/:itemId')
  async deleteItem(@Headers('authorization') auth: string, @Param('itemId') itemId: string) {
    const userId = await this.getUserId(auth);
    return this.artistInvoicesService.deleteItem(userId, itemId);
  }
}
