import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Param,
  Put,
} from '@nestjs/common';
import { ClientAuthService } from './client-auth.service';
import { ClientPortalService } from './client-portal.service';

@Controller('client-portal')
export class ClientPortalController {
  private readonly logger = new Logger(ClientPortalController.name);

  constructor(
    private readonly clientAuthService: ClientAuthService,
    private readonly clientPortalService: ClientPortalService,
  ) {}

  // ── Authentication ────────────────────────────────────────────────────────

  @Post('auth/request-otp')
  async requestOtp(
    @Body() body: { phone: string; agreedToSms: boolean; agreedToTerms: boolean },
  ) {
    if (!body?.phone) throw new BadRequestException('phone is required');
    return this.clientAuthService.requestOtp(
      body.phone,
      !!body.agreedToSms,
      !!body.agreedToTerms,
    );
  }

  @Post('auth/verify-otp')
  async verifyOtp(@Body() body: { phone: string; code: string }) {
    if (!body?.phone || !body?.code) {
      throw new BadRequestException('phone and code are required');
    }
    return this.clientAuthService.verifyOtp(body.phone, body.code);
  }

  @Post('auth/logout')
  async logout(@Headers('x-client-token') token: string) {
    if (!token) throw new UnauthorizedException();
    this.clientAuthService.revokeSession(token);
    return { message: 'Logged out successfully' };
  }

  // ── Guard helper ──────────────────────────────────────────────────────────

  private requireSession(token: string | undefined) {
    if (!token) throw new UnauthorizedException('Client token required');
    return this.clientAuthService.validateSession(token);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @Get('overview')
  async getOverview(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getOverview(session.clientId);
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  @Get('bookings')
  async getBookings(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getBookings(session.clientId);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  @Get('events')
  async getEvents(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getEvents(session.clientId);
  }

  // ── Vendors ───────────────────────────────────────────────────────────────

  @Get('vendors')
  async getVendors(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getVendors(session.clientId);
  }

  // ── Contracts ─────────────────────────────────────────────────────────────

  @Get('contracts')
  async getContracts(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getContracts(session.clientId);
  }

  // ── Estimates ─────────────────────────────────────────────────────────────

  @Get('estimates')
  async getEstimates(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getEstimates(session.clientId);
  }

  // ── Items & Packages ──────────────────────────────────────────────────────

  @Get('items')
  async getItems(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getItems(session.clientId);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  @Get('messages')
  async getMessages(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getMessages(session.clientId);
  }

  @Post('messages')
  async sendMessage(
    @Headers('x-client-token') token: string,
    @Body() body: { recipientId: string; content: string; eventId?: string },
  ) {
    const session = this.requireSession(token);
    if (!body?.recipientId || !body?.content) {
      throw new BadRequestException('recipientId and content are required');
    }
    return this.clientPortalService.sendMessage(
      session.clientId,
      session.phone,
      body.recipientId,
      body.content,
      body.eventId,
    );
  }

  // ── Notifications ─────────────────────────────────────────────────────────

  @Get('notifications')
  async getNotifications(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getNotifications(session.clientId);
  }

  @Put('notifications/:id/read')
  async markRead(
    @Headers('x-client-token') token: string,
    @Param('id') id: string,
  ) {
    const session = this.requireSession(token);
    return this.clientPortalService.markNotificationRead(session.clientId, id);
  }
}
