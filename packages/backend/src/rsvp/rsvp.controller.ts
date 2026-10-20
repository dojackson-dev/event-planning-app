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
  BadRequestException,
} from '@nestjs/common';
import { RsvpService } from './rsvp.service';
import { ClientAuthService } from '../client-portal/client-auth.service';
import { SupabaseService } from '../supabase/supabase.service';

type RsvpHeaders = { authorization?: string; 'x-client-token'?: string };

@Controller('rsvp')
export class RsvpController {
  constructor(
    private readonly rsvpService: RsvpService,
    private readonly clientAuthService: ClientAuthService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async requireSession(headers: RsvpHeaders) {
    if (headers['x-client-token'] !== undefined) {
      if (!headers['x-client-token'])
        throw new UnauthorizedException('Client token required');
      return this.clientAuthService.validateSession(headers['x-client-token'])
        .phone;
    }
    const token = headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Authentication required');
    const {
      data: { user },
      error,
    } = await this.supabaseService.getAdminClient().auth.getUser(token);
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return { ownerId: user.id };
  }

  // ── Authenticated (client portal) ─────────────────────────────────────────

  /** List RSVP-able events for the logged-in client. */
  @Get('events')
  async getEvents(@Headers() headers: RsvpHeaders) {
    const actor = await this.requireSession(headers);
    return this.rsvpService.getEventsForClient(actor);
  }

  /** List all guests for a given intake form / event. */
  @Get('guests/:intakeFormId')
  async getGuests(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
  ) {
    const actor = await this.requireSession(headers);
    return this.rsvpService.getGuests(intakeFormId, actor);
  }

  /** Add a single guest. */
  @Post('guests/:intakeFormId')
  async addGuest(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
    @Body()
    body: {
      guest_name: string;
      guest_phone?: string;
      guest_email?: string;
      table_assignment?: string;
    },
  ) {
    if (!body?.guest_name)
      throw new BadRequestException('guest_name is required');
    const actor = await this.requireSession(headers);
    return this.rsvpService.addGuest(intakeFormId, actor, body);
  }

  /** Bulk add guests. */
  @Post('guests/:intakeFormId/bulk')
  async bulkAddGuests(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
    @Body()
    body: {
      guests: Array<{
        guest_name: string;
        guest_phone?: string;
        guest_email?: string;
        table_assignment?: string;
      }>;
    },
  ) {
    const actor = await this.requireSession(headers);
    if (!Array.isArray(body?.guests))
      throw new BadRequestException('guests array is required');
    return this.rsvpService.bulkAddGuestsDetailed(
      intakeFormId,
      actor,
      body.guests,
    );
  }

  /** Update a guest (table assignment, phone, etc.). */
  @Put('guests/:intakeFormId/:guestId')
  async updateGuest(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
    @Param('guestId') guestId: string,
    @Body()
    body: Partial<{
      guest_name: string;
      guest_phone: string;
      guest_email: string;
      table_assignment: string;
    }>,
  ) {
    const actor = await this.requireSession(headers);
    return this.rsvpService.updateGuest(guestId, intakeFormId, actor, body);
  }

  /** Delete a guest. */
  @Delete('guests/:intakeFormId/:guestId')
  async deleteGuest(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
    @Param('guestId') guestId: string,
  ) {
    const actor = await this.requireSession(headers);
    await this.rsvpService.deleteGuest(guestId, intakeFormId, actor);
    return { success: true };
  }

  /** Send RSVP invite to a single guest. */
  @Post('guests/:intakeFormId/:guestId/send')
  async sendInvite(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
    @Param('guestId') guestId: string,
  ) {
    const actor = await this.requireSession(headers);
    return this.rsvpService.sendInvite(guestId, intakeFormId, actor);
  }

  /** Send RSVP invites to all guests not yet sent. */
  @Post('send-all/:intakeFormId')
  async sendAllInvites(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
  ) {
    const actor = await this.requireSession(headers);
    return this.rsvpService.sendAllInvites(intakeFormId, actor);
  }

  // ── Public (token-gated, no auth required) ────────────────────────────────

  /** Get invitation images for an event. */
  @Get('images/:intakeFormId')
  async getImages(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
  ) {
    const actor = await this.requireSession(headers);
    return this.rsvpService.getInvitationImages(intakeFormId, actor);
  }

  /** Set invitation images for an event (max 2). */
  @Put('images/:intakeFormId')
  async setImages(
    @Headers() headers: RsvpHeaders,
    @Param('intakeFormId') intakeFormId: string,
    @Body() body: { images: string[] },
  ) {
    if (!Array.isArray(body?.images))
      throw new BadRequestException('images array is required');
    const actor = await this.requireSession(headers);
    return this.rsvpService.setInvitationImages(
      intakeFormId,
      actor,
      body.images,
    );
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
    @Body()
    body: {
      phone_last_four?: string;
      status: 'attending' | 'declined';
      plus_ones?: number;
      meal_preference?: string;
      sms_opt_in?: boolean;
    },
  ) {
    if (!body?.status) throw new BadRequestException('status is required');
    return this.rsvpService.respondToInvite(token, body.phone_last_four, {
      status: body.status,
      plus_ones: body.plus_ones,
      meal_preference: body.meal_preference,
      sms_opt_in: body.sms_opt_in,
    });
  }
}
