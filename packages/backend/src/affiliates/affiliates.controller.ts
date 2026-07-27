import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  Query,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliateGuard } from './guards/affiliate.guard';
import { RegisterAffiliateDto, LoginAffiliateDto, UpdateAffiliateDto, InviteAffiliateDto } from './dto/affiliate.dto';

@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  // ─── Public ──────────────────────────────────────────────────────────────

  /** Validate an invite token before showing the register form */
  @Get('invite/validate')
  async validateInvite(@Query('token') token: string) {
    if (!token) return { valid: false, reason: 'No token provided' };
    return this.affiliatesService.validateInviteToken(token);
  }

  /** Register a new affiliate account (requires a valid invite token) */
  @Post('register')
  async register(@Body() dto: RegisterAffiliateDto) {
    return this.affiliatesService.register(dto);
  }

  /** Login and receive a JWT session */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginAffiliateDto) {
    return this.affiliatesService.login(dto.email, dto.password);
  }

  // ─── Authenticated ────────────────────────────────────────────────────────

  /** Get own affiliate profile */
  @Get('me')
  @UseGuards(AffiliateGuard)
  async getMe(@Req() req: any) {
    return this.affiliatesService.getMe(req.affiliate.id);
  }

  /** Update own profile */
  @Patch('me')
  @UseGuards(AffiliateGuard)
  async updateMe(@Req() req: any, @Body() dto: UpdateAffiliateDto) {
    return this.affiliatesService.updateMe(req.affiliate.id, dto);
  }

  /** Dashboard stats — total recruits, conversions, earnings */
  @Get('dashboard')
  @UseGuards(AffiliateGuard)
  async getDashboard(@Req() req: any) {
    return this.affiliatesService.getDashboard(req.affiliate.id);
  }

  /** List of all owners recruited */
  @Get('referrals')
  @UseGuards(AffiliateGuard)
  async getReferrals(@Req() req: any) {
    return this.affiliatesService.getReferrals(req.affiliate.id);
  }

  /** Commission history */
  @Get('commissions')
  @UseGuards(AffiliateGuard)
  async getCommissions(@Req() req: any) {
    return this.affiliatesService.getCommissions(req.affiliate.id);
  }

  /** Sales manager: all platform users with subscription status */
  @Get('manager/users')
  @UseGuards(AffiliateGuard)
  async getManagerUsers(
    @Req() req: any,
    @Query('search') search = '',
    @Query('role') role = '',
  ) {
    return this.affiliatesService.getManagerUsers(req.affiliate.email, search, role);
  }

  /** Sales manager: full detail for a single platform user */
  @Get('manager/users/:id')
  @UseGuards(AffiliateGuard)
  async getManagerUserDetail(@Req() req: any, @Param('id') id: string) {
    return this.affiliatesService.getManagerUserDetail(req.affiliate.email, id);
  }

  /** Sales manager: invite a new affiliate by email */
  @Post('manager/invite')
  @UseGuards(AffiliateGuard)
  async inviteAffiliate(@Req() req: any, @Body() dto: InviteAffiliateDto) {
    return this.affiliatesService.inviteAffiliate(dto.email, req.affiliate.email);
  }

  /** Sales manager: all registered affiliates with stats */
  @Get('manager/affiliates')
  @UseGuards(AffiliateGuard)
  async getManagerAffiliates(@Req() req: any) {
    return this.affiliatesService.getManagerAffiliates(req.affiliate.email);
  }
}
