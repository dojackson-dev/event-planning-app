import { Controller, Post, Body, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthFlowService } from './auth-flow.service';
import { OwnerSignupDto, OwnerLoginDto } from './dto/owner-signup.dto';
import { CreateInviteDto, AcceptInviteDto } from './dto/client-invite.dto';
import type { Request } from 'express';

@Controller('auth/flow')
export class AuthFlowController {
  constructor(private readonly authFlowService: AuthFlowService) {}

  /**
   * OWNER ROUTES
   */
  @Post('owner/signup')
  async ownerSignup(@Body() dto: OwnerSignupDto) {
    return this.authFlowService.ownerSignup(dto);
  }

  @Post('owner/login')
  async ownerLogin(@Body() dto: OwnerLoginDto) {
    return this.authFlowService.ownerLogin(dto);
  }

  @Post('owner/verify-phone')
  async verifyPhone(@Body() dto: any) {
    return this.authFlowService.verifyPhone(dto);
  }

  @Get('owner/billing-portal')
  async getBillingPortal(@Req() req: Request) {
    const ownerUserId = req.headers.authorization?.split('Bearer ')[1] || '';
    return this.authFlowService.getBillingPortal(ownerUserId);
  }

  /**
   * CLIENT INVITE ROUTES
   */
  @Post('client/invite')
  async createInvite(
    @Body() dto: CreateInviteDto,
    @Req() req: Request,
  ) {
    // Get owner user ID from auth token (would use guard in production)
    const ownerUserId = req.headers.authorization?.split('Bearer ')[1] || '';
    return this.authFlowService.createClientInvite(dto, ownerUserId);
  }

  @Post('client/accept-invite')
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string;
    const userAgent = req.headers['user-agent'];
    
    return this.authFlowService.acceptClientInvite(dto, ipAddress, userAgent);
  }

  @Post('client/sms-consent')
  async recordSmsConsent(
    @Body() dto: any,
    @Req() req: Request,
  ) {
    dto.ipAddress = req.ip || req.headers['x-forwarded-for'];
    dto.userAgent = req.headers['user-agent'];
    return this.authFlowService.recordSmsConsent(dto);
  }

  @Post('client/verify-phone')
  async verifyClientPhone(@Body() dto: any) {
    return this.authFlowService.verifyPhone(dto);
  }

  /**
   * ADMIN ROUTES
   */
  @Post('admin/login')
  async adminLogin(
    @Body() body: { email: string; password: string },
  ) {
    return this.authFlowService.adminLogin(body.email, body.password);
  }
}
