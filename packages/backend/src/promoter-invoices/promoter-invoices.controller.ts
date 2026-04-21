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
import { PromoterInvoicesService } from './promoter-invoices.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreatePromoterInvoiceDto,
  UpdatePromoterInvoiceDto,
  PromoterInvoiceItemDto,
} from './dto/promoter-invoice.dto';

@Controller('promoter-invoices')
export class PromoterInvoicesController {
  private readonly logger = new Logger(PromoterInvoicesController.name);

  constructor(
    private readonly promoterInvoicesService: PromoterInvoicesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    if (token.startsWith('local-')) return token.replace('local-', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  @Get('public/:token')
  async getPublicInvoice(@Param('token') token: string) {
    return this.promoterInvoicesService.getPublicInvoice(token);
  }

  @Post('public/:token/checkout')
  async createPublicCheckout(@Param('token') token: string) {
    return this.promoterInvoicesService.createCheckoutSession(token);
  }

  @Post('public/:token/verify-payment')
  async verifyPayment(@Param('token') token: string) {
    return this.promoterInvoicesService.verifyPayment(token);
  }

  // ─── AUTHENTICATED ────────────────────────────────────────────────────────

  @Post()
  async createInvoice(@Headers('authorization') auth: string, @Body() dto: CreatePromoterInvoiceDto) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.createInvoice(userId, dto);
  }

  @Get('mine')
  async listInvoices(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.listInvoices(userId);
  }

  @Get(':id')
  async getInvoice(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.getInvoice(userId, id);
  }

  @Put(':id')
  async updateInvoice(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromoterInvoiceDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.updateInvoice(userId, id, dto);
  }

  @Delete(':id')
  async deleteInvoice(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.deleteInvoice(userId, id);
  }

  @Post(':id/send')
  async sendInvoice(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.sendInvoice(userId, id);
  }

  @Post(':id/items')
  async addItem(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() item: PromoterInvoiceItemDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.addItem(userId, id, item);
  }

  @Put('items/:itemId')
  async updateItem(
    @Headers('authorization') auth: string,
    @Param('itemId') itemId: string,
    @Body() item: Partial<PromoterInvoiceItemDto>,
  ) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.updateItem(userId, itemId, item);
  }

  @Delete('items/:itemId')
  async deleteItem(@Headers('authorization') auth: string, @Param('itemId') itemId: string) {
    const userId = await this.getUserId(auth);
    return this.promoterInvoicesService.deleteItem(userId, itemId);
  }
}
