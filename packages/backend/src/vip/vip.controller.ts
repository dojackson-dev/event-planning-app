import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { VipService } from './vip.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  CreateVipSectionDto,
  CreateVipPackageDto,
  UpdateVipPackageDto,
  CreateVipServiceItemDto,
  VipCheckoutDto,
  ScanVipDto,
  AssignConciergeDto,
  UpdateServiceOrderDto,
  CreateVipConciergeDto,
} from './dto/vip.dto';

@Controller('vip')
export class VipController {
  constructor(
    private readonly service: VipService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ── PUBLIC ────────────────────────────────────────────────────

  /** Get all VIP packages, service items, and layout for an event (buyer page) */
  @Get('public/events/:eventId')
  getPublicVipInfo(@Param('eventId') eventId: string) {
    return this.service.getPublicVipInfo(eventId);
  }

  /** Buyer creates VIP checkout */
  @Post('public/events/:eventId/packages/:packageId/checkout')
  createCheckout(
    @Param('eventId') eventId: string,
    @Param('packageId') packageId: string,
    @Body() dto: VipCheckoutDto,
  ) {
    return this.service.createVipCheckout(eventId, packageId, dto);
  }

  /** Buyer gets their VIP order confirmation by Stripe session ID */
  @Get('public/orders/session/:sessionId')
  getOrderBySession(@Param('sessionId') sessionId: string) {
    return this.service.getPublicOrderBySession(sessionId);
  }

  /** Get VIP order by QR code (for check-in scanner) */
  @Get('public/orders/qr/:qrCode')
  getOrderByQr(@Param('qrCode') qrCode: string) {
    return this.service.getOrderByQr(qrCode);
  }

  /** Forward/transfer a VIP ticket to a new recipient */
  @Post('public/orders/qr/:qrCode/transfer')
  transferOrder(
    @Param('qrCode') qrCode: string,
    @Body() body: { recipient_email: string; recipient_name?: string },
  ) {
    return this.service.transferVipOrder(qrCode, body.recipient_email, body.recipient_name);
  }

  // ── SECTIONS ──────────────────────────────────────────────────

  @Post('events/:eventId/sections')
  async createSection(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateVipSectionDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.createSection(userId, eventId, dto);
  }

  @Get('events/:eventId/sections')
  listSections(@Param('eventId') eventId: string) {
    return this.service.listSections(eventId);
  }

  @Delete('sections/:sectionId')
  async deleteSection(
    @Headers('authorization') auth: string,
    @Param('sectionId') sectionId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.deleteSection(userId, sectionId);
  }

  // ── PACKAGES ──────────────────────────────────────────────────

  @Post('events/:eventId/packages')
  async createPackage(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateVipPackageDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.createPackage(userId, eventId, dto);
  }

  @Get('events/:eventId/packages')
  listPackages(@Param('eventId') eventId: string) {
    return this.service.listPackages(eventId);
  }

  @Put('packages/:packageId')
  async updatePackage(
    @Headers('authorization') auth: string,
    @Param('packageId') packageId: string,
    @Body() dto: UpdateVipPackageDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.updatePackage(userId, packageId, dto);
  }

  @Delete('packages/:packageId')
  async deletePackage(
    @Headers('authorization') auth: string,
    @Param('packageId') packageId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.deletePackage(userId, packageId);
  }

  // ── SERVICE ITEMS ─────────────────────────────────────────────

  @Post('events/:eventId/service-items')
  async createServiceItem(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateVipServiceItemDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.createServiceItem(userId, eventId, dto);
  }

  @Get('events/:eventId/service-items')
  listServiceItems(@Param('eventId') eventId: string) {
    return this.service.listServiceItems(eventId);
  }

  @Delete('service-items/:itemId')
  async deleteServiceItem(
    @Headers('authorization') auth: string,
    @Param('itemId') itemId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.deleteServiceItem(userId, itemId);
  }

  // ── LAYOUTS ───────────────────────────────────────────────────

  @Post('events/:eventId/layout')
  async saveLayout(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
    @Body() body: { file_url: string; file_type?: string; description?: string },
  ) {
    const userId = await this.getUserId(auth);
    return this.service.saveLayout(userId, eventId, body.file_url, body.file_type || 'image', body.description);
  }

  @Get('events/:eventId/layout')
  getLayouts(@Param('eventId') eventId: string) {
    return this.service.getLayouts(eventId);
  }

  // ── ORDERS ────────────────────────────────────────────────────

  @Get('events/:eventId/orders')
  async listOrders(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.listOrders(userId, eventId);
  }

  @Get('orders/:orderId')
  async getOrder(
    @Headers('authorization') auth: string,
    @Param('orderId') orderId: string,
  ) {
    await this.getUserId(auth);
    return this.service.getOrder(orderId);
  }

  // ── CHECK-IN ──────────────────────────────────────────────────

  @Post('events/:eventId/scan')
  async scanVip(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
    @Body() dto: ScanVipDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.scanVip(userId, eventId, dto);
  }

  // ── CONCIERGE PHONE ACCESS ────────────────────────────────────

  /** Public: concierge accesses their event portal via access code (no login) */
  @Get('public/concierge/:accessCode')
  getConciergePortal(@Param('accessCode') accessCode: string) {
    return this.service.getConciergePortal(accessCode);
  }

  /** Public: concierge scans a VIP order QR code using their access code */
  @Post('public/concierge/:accessCode/scan')
  scanVipByConcierge(
    @Param('accessCode') accessCode: string,
    @Body() body: { qr_code: string; check_in_mode?: 'single' | 'full' },
  ) {
    return this.service.scanVipByAccessCode(accessCode, body.qr_code, body.check_in_mode ?? 'single');
  }

  @Post('events/:eventId/concierges')
  async createConcierge(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
    @Body() dto: CreateVipConciergeDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.createConcierge(userId, eventId, dto);
  }

  @Get('events/:eventId/concierges')
  async listConcierges(
    @Headers('authorization') auth: string,
    @Param('eventId') eventId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.listConcierges(userId, eventId);
  }

  @Delete('concierges/:conciergeId')
  async deleteConcierge(
    @Headers('authorization') auth: string,
    @Param('conciergeId') conciergeId: string,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.deleteConcierge(userId, conciergeId);
  }

  // ── CONCIERGE ASSIGNMENT (legacy) ─────────────────────────────

  @Put('orders/:orderId/concierge')
  async assignConcierge(
    @Headers('authorization') auth: string,
    @Param('orderId') orderId: string,
    @Body() dto: AssignConciergeDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.assignConcierge(userId, orderId, dto);
  }

  // ── SERVICE ORDERS ────────────────────────────────────────────

  @Put('service-orders/:serviceOrderId')
  async updateServiceOrder(
    @Headers('authorization') auth: string,
    @Param('serviceOrderId') serviceOrderId: string,
    @Body() dto: UpdateServiceOrderDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.service.updateServiceOrder(userId, serviceOrderId, dto);
  }
}
