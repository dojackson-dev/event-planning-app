import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AffiliateGuard } from './guards/affiliate.guard';
import { RegisterAffiliateDto, LoginAffiliateDto, UpdateAffiliateDto } from './dto/affiliate.dto';

@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  // ─── Public ──────────────────────────────────────────────────────────────

  /** Register a new affiliate account */
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
}
