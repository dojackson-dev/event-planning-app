import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Headers,
  Param,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PromoterService } from './promoter.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePromoterDto, UpdatePromoterDto } from './dto/promoter.dto';

@Controller('promoter')
export class PromoterController {
  private readonly logger = new Logger(PromoterController.name);

  constructor(
    private readonly promoterService: PromoterService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ─────────────────────────────────────────────
  // AUTH HELPER
  // ─────────────────────────────────────────────

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');

    if (token.startsWith('local-')) {
      return token.replace('local-', '');
    }

    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ─────────────────────────────────────────────
  // ROUTES
  // ─────────────────────────────────────────────

  /**
   * POST /promoter/register
   * Create a promoter account (standalone or linked to owner).
   */
  @Post('register')
  async register(
    @Headers('authorization') authorization: string,
    @Body() dto: CreatePromoterDto,
  ) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.createPromoterAccount(userId, dto);
  }

  /**
   * POST /promoter/enable
   * Owner enables promoter mode — creates linked promoter_account.
   */
  @Post('enable')
  async enablePromoterMode(
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.enablePromoterMode(userId);
  }

  /**
   * GET /promoter/public/:id
   * Public promoter profile + upcoming events (no auth)
   */
  @Get('public/:id')
  getPublicProfile(@Param('id') id: string) {
    return this.promoterService.getPublicProfile(id);
  }

  /**
   * GET /promoter/profile
   */
  @Get('profile')
  async getProfile(
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.getPromoterProfile(userId);
  }

  /**
   * PUT /promoter/profile
   */
  @Put('profile')
  async updateProfile(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdatePromoterDto,
  ) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.updatePromoterProfile(userId, dto);
  }

  /**
   * GET /promoter/dashboard
   */
  @Get('dashboard')
  async getDashboard(
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.getDashboardStats(userId);
  }

  /**
   * PATCH /promoter/plan
   * Let a promoter select their own plan (free / pro / premium).
   */
  @Patch('plan')
  async updatePlan(
    @Headers('authorization') authorization: string,
    @Body() body: { plan: string },
  ) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.updatePlan(userId, body.plan);
  }

  // ─────────────────────────────────────────────
  // BOOKING LINKS
  // ─────────────────────────────────────────────

  /** POST /promoter/booking-links — create or update booking link */
  @Post('booking-links')
  async upsertBookingLink(
    @Headers('authorization') authorization: string,
    @Body() dto: { slug: string; isActive?: boolean; customMessage?: string },
  ) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.upsertBookingLink(userId, dto);
  }

  /** GET /promoter/booking-links/mine */
  @Get('booking-links/mine')
  async getMyBookingLink(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.getMyBookingLink(userId);
  }

  /** GET /promoter/booking-links/requests */
  @Get('booking-links/requests')
  async getBookingRequests(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.getPromoterBookingRequests(userId);
  }

  /** PUT /promoter/booking-links/requests/:id */
  @Put('booking-links/requests/:id')
  async updateBookingRequest(
    @Headers('authorization') authorization: string,
    @Param('id') requestId: string,
    @Body() body: { status: string },
  ) {
    const userId = await this.getUserId(authorization);
    return this.promoterService.updatePromoterBookingRequest(userId, requestId, body.status);
  }

  /** GET /promoter/booking-link/s/:code — public: resolve short code */
  @Get('booking-link/s/:code')
  async getPublicBookingLinkByShortCode(@Param('code') code: string) {
    return this.promoterService.getPublicBookingLinkByShortCode(code);
  }

  /** GET /promoter/booking-link/:slug — public: view booking link */
  @Get('booking-link/:slug')
  async getPublicBookingLink(@Param('slug') slug: string) {
    return this.promoterService.getPublicBookingLink(slug);
  }

  /** POST /promoter/booking-link/:slug/request — public: submit booking request */
  @Post('booking-link/:slug/request')
  async submitBookingRequest(
    @Param('slug') slug: string,
    @Body() dto: any,
  ) {
    return this.promoterService.submitBookingRequest(slug, dto);
  }
}
