import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { GuestListsService } from './guest-lists.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('guest-lists')
export class GuestListsController {
  constructor(
    private readonly guestListsService: GuestListsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization)
      throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');

    if (token.startsWith('local-')) {
      return token.replace('local-', '');
    }

    const supabase = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  @Get()
  async findAll(
    @Headers('authorization') authorization: string,
    @Query('clientId') clientId?: string,
  ): Promise<any[]> {
    const userId = await this.getUserId(authorization);
    if (clientId) {
      return this.guestListsService.findByClient(clientId);
    }
    return this.guestListsService.findAllForOwner(userId);
  }

  @Get('by-event/:eventId')
  async findByEvent(
    @Headers('authorization') authorization: string,
    @Param('eventId', ParseIntPipe) eventId: number,
  ): Promise<any | null> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertOwnsEvent(eventId, userId);
    return this.guestListsService.findByEvent(eventId);
  }

  // Public guest self-service routes — access is via an unguessable
  // token/code (the secret itself), not the caller's identity, so these
  // intentionally do not require a Bearer auth header.
  @Get('share/:token')
  async findByShareToken(@Param('token') token: string): Promise<any | null> {
    return this.guestListsService.findByShareToken(token);
  }

  @Get('code/:code')
  async findByAccessCode(@Param('code') code: string): Promise<any | null> {
    return this.guestListsService.findByAccessCode(code);
  }

  @Post('validate-access')
  async validateAccess(
    @Body() body: { guestListId: number; accessCode: string },
  ): Promise<{ valid: boolean }> {
    const valid = await this.guestListsService.validateAccessCode(
      body.guestListId,
      body.accessCode,
    );
    return { valid };
  }

  @Get('arrival/:token')
  async findByArrivalToken(@Param('token') token: string): Promise<any | null> {
    return this.guestListsService.findByArrivalToken(token);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any | null> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(id, userId);
    return this.guestListsService.findOne(id);
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() guestList: any,
  ): Promise<any> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertOwnsEvent(guestList.eventId, userId);
    console.log(
      'Received guest list data:',
      JSON.stringify(guestList, null, 2),
    );
    return this.guestListsService.create(guestList);
  }

  @Put(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() guestList: any,
  ): Promise<any | null> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(id, userId);
    return this.guestListsService.update(id, guestList);
  }

  @Post(':id/lock')
  async lock(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any | null> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(id, userId);
    return this.guestListsService.lock(id);
  }

  @Post(':id/unlock')
  async unlock(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any | null> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(id, userId);
    return this.guestListsService.unlock(id);
  }

  @Delete(':id')
  async delete(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(id, userId);
    return this.guestListsService.delete(id);
  }

  // Guest endpoints
  @Get(':id/guests')
  async getGuests(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) guestListId: number,
  ): Promise<any[]> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(guestListId, userId);
    return this.guestListsService.getGuests(guestListId);
  }

  @Post(':id/guests')
  async addGuest(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) guestListId: number,
    @Body() guest: any,
  ): Promise<any> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(guestListId, userId);
    return this.guestListsService.addGuest(guestListId, guest);
  }

  @Put('guests/:guestId')
  async updateGuest(
    @Headers('authorization') authorization: string,
    @Param('guestId', ParseIntPipe) guestId: number,
    @Body() guest: any,
  ): Promise<any | null> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestOwnership(guestId, userId);
    return this.guestListsService.updateGuest(guestId, guest);
  }

  @Delete('guests/:guestId')
  async deleteGuest(
    @Headers('authorization') authorization: string,
    @Param('guestId', ParseIntPipe) guestId: number,
  ): Promise<void> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestOwnership(guestId, userId);
    return this.guestListsService.deleteGuest(guestId);
  }

  @Post('guests/:guestId/arrive')
  async markArrival(
    @Headers('authorization') authorization: string,
    @Param('guestId', ParseIntPipe) guestId: number,
  ): Promise<any | null> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestOwnership(guestId, userId);
    return this.guestListsService.markArrival(guestId);
  }

  @Post('guests/:guestId/unarrive')
  async unmarkArrival(
    @Headers('authorization') authorization: string,
    @Param('guestId', ParseIntPipe) guestId: number,
  ): Promise<any | null> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestOwnership(guestId, userId);
    return this.guestListsService.unmarkArrival(guestId);
  }

  @Post(':id/sms-client')
  async smsClientInvite(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ sent: boolean; to?: string; error?: string }> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(id, userId);
    return this.guestListsService.smsClientInvite(id);
  }

  @Post(':id/import-rsvp')
  async importFromRsvp(
    @Headers('authorization') authorization: string,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ imported: number; skipped: number }> {
    const userId = await this.getUserId(authorization);
    await this.guestListsService.assertGuestListOwnership(id, userId);
    return this.guestListsService.importFromRsvp(id);
  }
}
