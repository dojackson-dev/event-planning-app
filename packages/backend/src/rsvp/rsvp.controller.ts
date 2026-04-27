import {
  Controller, Get, Post, Put, Delete, Body, Param, Headers,
  UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { ClientAuthService } from '../client-portal/client-auth.service';

@Controller('rsvp')
export class RsvpController {
  constructor(
    private readonly rsvpService: RsvpService,
    private readonly clientAuthService: ClientAuthService,
  ) {}

  private requireSession(token: string | undefined) {
    if (!token) throw new UnauthorizedException('Client token required');
    return this.clientAuthService.validateSession(token);
  }

  // ── Authenticated (client portal) ─────────────────────────────────────────

  /** List RSVP-able events for the logged-in client. */
  @Get('events')
  async getEvents(@Headers('x-client-token') token: string) {
    const session = this.requireSession(token);
    return this.rsvpService.getEventsForClient(session.phone);
  }

  /** List all guests for a given intake form / event. */
  @Get('guests/:intakeFormId')
  async getGuests(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
  ) {
    const session = this.requireSession(token);
    return this.rsvpService.getGuests(intakeFormId, session.phone);
  }

  /** Add a single guest. */
  @Post('guests/:intakeFormId')
  async addGuest(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
    @Body() body: { guest_name: string; guest_phone?: string; guest_email?: string; table_assignment?: string },
  ) {
    if (!body?.guest_name) throw new BadRequestException('guest_name is required');
    const session = this.requireSession(token);
    return this.rsvpService.addGuest(intakeFormId, session.phone, body);
  }

  /** Bulk add guests. */
  @Post('guests/:intakeFormId/bulk')
  async bulkAddGuests(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
    @Body() body: { guests: Array<{ guest_name: string; guest_phone?: string; guest_email?: string; table_assignment?: string }> },
  ) {
    const session = this.requireSession(token);
    if (!Array.isArray(body?.guests)) throw new BadRequestException('guests array is required');
    return this.rsvpService.bulkAddGuests(intakeFormId, session.phone, body.guests);
  }

  /** Update a guest (table assignment, phone, etc.). */
  @Put('guests/:intakeFormId/:guestId')
  async updateGuest(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
    @Param('guestId') guestId: string,
    @Body() body: Partial<{ guest_name: string; guest_phone: string; guest_email: string; table_assignment: string }>,
  ) {
    const session = this.requireSession(token);
    return this.rsvpService.updateGuest(guestId, intakeFormId, session.phone, body);
  }

  /** Delete a guest. */
  @Delete('guests/:intakeFormId/:guestId')
  async deleteGuest(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
    @Param('guestId') guestId: string,
  ) {
    const session = this.requireSession(token);
    await this.rsvpService.deleteGuest(guestId, intakeFormId, session.phone);
    return { success: true };
  }

  /** Send RSVP invite to a single guest. */
  @Post('guests/:intakeFormId/:guestId/send')
  async sendInvite(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
    @Param('guestId') guestId: string,
  ) {
    const session = this.requireSession(token);
    return this.rsvpService.sendInvite(guestId, intakeFormId, session.phone);
  }

  /** Send RSVP invites to all guests not yet sent. */
  @Post('send-all/:intakeFormId')
  async sendAllInvites(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
  ) {
    const session = this.requireSession(token);
    return this.rsvpService.sendAllInvites(intakeFormId, session.phone);
  }

  // ── Public (token-gated, no auth required) ────────────────────────────────

  /** Get invitation images for an event. */
  @Get('images/:intakeFormId')
  async getImages(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
  ) {
    const session = this.requireSession(token);
    return this.rsvpService.getInvitationImages(intakeFormId, session.phone);
  }

  /** Set invitation images for an event (max 2). */
  @Put('images/:intakeFormId')
  async setImages(
    @Headers('x-client-token') token: string,
    @Param('intakeFormId') intakeFormId: string,
    @Body() body: { images: string[] },
  ) {
    if (!Array.isArray(body?.images)) throw new BadRequestException('images array is required');
    const session = this.requireSession(token);
    return this.rsvpService.setInvitationImages(intakeFormId, session.phone, body.images);
  }

  /** Get public invite info (guest name, event, table). */
  @Get(':token')
  async getPublicInvite(@Param('token') token: string) {
    return this.rsvpService.getPublicInvite(token);
  }

  /** Submit RSVP response (with optional phone verification). */
  @Post(':token/respond')
  async respond(
    @Param('token') token: string,
    @Body() body: {
      phone_last_four?: string;
      status: 'attending' | 'declined';
      plus_ones?: number;
      meal_preference?: string;
    },
  ) {
    if (!body?.status) throw new BadRequestException('status is required');
    return this.rsvpService.respondToInvite(token, body.phone_last_four, {
      status: body.status,
      plus_ones: body.plus_ones,
      meal_preference: body.meal_preference,
    });
  }
}
