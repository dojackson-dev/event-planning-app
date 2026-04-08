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
  Query,
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
    @Body() body: { phone: string; agreedToSms: boolean; agreedToTerms: boolean; name?: string },
  ) {
    if (!body?.phone) throw new BadRequestException('phone is required');
    return this.clientAuthService.requestOtp(
      body.phone,
      !!body.agreedToSms,
      !!body.agreedToTerms,
      body.name?.trim() || undefined,
    );
  }

  @Post('auth/verify-otp')
  async verifyOtp(@Body() body: { phone: string; code: string; name?: string }) {
    if (!body?.phone || !body?.code) {
      throw new BadRequestException('phone and code are required');
    }
    return this.clientAuthService.verifyOtp(body.phone, body.code, body.name?.trim() || undefined);
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
    return this.clientPortalService.getOverview(session.clientId, session.phone);
  }

  // ── Bookings ──────────────────────────────────────────────────────────────

  @Get('bookings')
  async getBookings(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getBookings(session.clientId, session.phone);
  }

  // ── Events ────────────────────────────────────────────────────────────────

  @Get('events')
  async getEvents(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getEvents(session.clientId, session.phone);
  }

  // ── Vendors ───────────────────────────────────────────────────────────────

  @Get('vendors/browse')
  async browseVendors(
    @Headers('x-client-token') token: string,
    @Query('category') category: string,
  ) {
    this.requireSession(token);
    return this.clientPortalService.browseVendors(category || undefined);
  }

  @Post('vendors/book')
  async bookVendor(
    @Headers('x-client-token') token: string,
    @Body() body: {
      vendorAccountId: string;
      eventName: string;
      eventDate: string;
      startTime?: string;
      endTime?: string;
      venueName?: string;
      venueAddress?: string;
      notes?: string;
    },
  ) {
    const session = this.requireSession(token);
    if (!body?.vendorAccountId || !body?.eventName || !body?.eventDate) {
      throw new BadRequestException('vendorAccountId, eventName, and eventDate are required');
    }
    const clientName = [session.firstName, session.lastName].filter(Boolean).join(' ') || session.phone;
    return this.clientPortalService.bookVendor(
      session.clientId,
      session.phone,
      clientName,
      body,
    );
  }

  @Get('vendors')
  async getVendors(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getVendors(session.clientId, session.phone);
  }

  // ── Booking Confirmations ─────────────────────────────────────────────────

  @Get('confirmations')
  async getPendingConfirmations(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getPendingConfirmations(session.clientId, session.phone);
  }

  @Post('confirmations/:bookingId')
  async respondToConfirmation(
    @Headers('x-client-token') token: string,
    @Param('bookingId') bookingId: string,
    @Body() body: { action: 'confirmed' | 'rejected' },
  ) {
    const session = this.requireSession(token);
    if (body.action !== 'confirmed' && body.action !== 'rejected') {
      throw new BadRequestException('action must be "confirmed" or "rejected"');
    }
    return this.clientPortalService.respondToConfirmation(session.phone, bookingId, body.action);
  }

  // ── Contracts ─────────────────────────────────────────────────────────────

  @Get('contracts')
  async getContracts(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getContracts(session.clientId, session.phone);
  }

  @Get('contracts/:id')
  async getContractById(
    @Headers('x-client-token') token: string,
    @Param('id') id: string,
  ) {
    const session = this.requireSession(token);
    return this.clientPortalService.getContractById(id, session.clientId, session.phone);
  }

  @Post('contracts/:id/sign')
  async signContract(
    @Headers('x-client-token') token: string,
    @Param('id') id: string,
    @Body() body: { signatureData: string; signerName: string },
  ) {
    const session = this.requireSession(token);
    if (!body?.signatureData || !body?.signerName) {
      throw new BadRequestException('signatureData and signerName are required');
    }
    return this.clientPortalService.signClientContract(
      id,
      session.clientId,
      session.phone,
      body.signatureData,
      body.signerName,
    );
  }



  @Get('estimates')
  async getEstimates(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getEstimates(session.clientId, session.phone);
  }

  @Get('estimates/:id')
  async getEstimateById(
    @Headers('x-client-token') token: string,
    @Param('id') id: string,
  ) {
    const session = this.requireSession(token);
    return this.clientPortalService.getEstimateById(id, session.clientId, session.phone);
  }

  @Post('estimates/:id/viewed')
  async markEstimateViewed(
    @Headers('x-client-token') token: string,
    @Param('id') id: string,
  ) {
    this.requireSession(token);
    return this.clientPortalService.markViewed('estimates', id);
  }

  @Post('contracts/:id/viewed')
  async markContractViewed(
    @Headers('x-client-token') token: string,
    @Param('id') id: string,
  ) {
    this.requireSession(token);
    return this.clientPortalService.markViewed('contracts', id);
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  @Get('invoices')
  async getInvoices(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getInvoices(session.clientId, session.phone);
  }

  @Post('invoices/:id/checkout')
  async createInvoiceCheckout(
    @Headers('x-client-token') token: string,
    @Param('id') id: string,
  ) {
    const session = this.requireSession(token);
    return this.clientPortalService.createInvoiceCheckout(
      id,
      session.clientId,
      session.phone,
      `${session.firstName} ${session.lastName}`.trim() || 'Client',
    );
  }

  // ── Items & Packages ──────────────────────────────────────────────────────

  @Get('items')
  async getItems(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.clientPortalService.getItems(session.clientId, session.phone);
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

  // ── Invite-based Confirmation Flow ────────────────────────────────────────

  /**
   * Public endpoint: returns intake form event details for the invite landing page.
   * No session required — the token itself grants access to the display data.
   */
  @Get('invite/:token')
  async getInvite(@Param('token') token: string) {
    if (!token) throw new BadRequestException('invite token is required');
    return this.clientPortalService.getIntakeFormByToken(token);
  }

  /**
   * Confirm the invite — client must be authenticated via SMS OTP.
   * Their session phone must match the intake form's contact_phone.
   */
  @Post('invite/:token/confirm')
  async confirmInvite(
    @Headers('x-client-token') clientToken: string,
    @Param('token') inviteToken: string,
  ) {
    const session = this.requireSession(clientToken);
    return this.clientPortalService.confirmInvite(inviteToken, session.phone, session.clientId);
  }

  /**
   * Decline the invite — client must be authenticated.
   */
  @Post('invite/:token/decline')
  async declineInvite(
    @Headers('x-client-token') clientToken: string,
    @Param('token') inviteToken: string,
  ) {
    const session = this.requireSession(clientToken);
    return this.clientPortalService.declineInvite(inviteToken, session.phone);
  }

  // ── Vendor Reviews ───────────────────────────────────────────────────────

  @Post('vendors/review')
  async leaveVendorReview(
    @Headers('x-client-token') token: string,
    @Body() body: { vendorAccountId: string; rating: number; reviewText?: string },
  ) {
    const session = this.requireSession(token);
    if (!body?.vendorAccountId || !body?.rating) {
      throw new BadRequestException('vendorAccountId and rating are required');
    }
    const reviewerName = [session.firstName, session.lastName].filter(Boolean).join(' ') || 'Client';
    return this.clientPortalService.leaveVendorReview(
      session.clientId,
      reviewerName,
      body.vendorAccountId,
      body.rating,
      body.reviewText,
    );
  }
}
