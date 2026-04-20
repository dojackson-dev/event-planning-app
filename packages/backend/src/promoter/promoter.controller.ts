import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Headers,
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
}
