import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { GuestListsService } from './guest-lists.service';
import { GuestList } from '../entities/guest-list.entity';
import { Guest } from '../entities/guest.entity';

@Controller('guest-lists')
export class GuestListsController {
  constructor(private readonly guestListsService: GuestListsService) {}

  @Get()
  async findAll(@Query('clientId') clientId?: string): Promise<GuestList[]> {
    if (clientId) {
      return this.guestListsService.findByClient(parseInt(clientId));
    }
    return this.guestListsService.findAll();
  }

  @Get('by-event/:eventId')
  async findByEvent(@Param('eventId', ParseIntPipe) eventId: number): Promise<GuestList | null> {
    return this.guestListsService.findByEvent(eventId);
  }

  @Get('share/:token')
  async findByShareToken(@Param('token') token: string): Promise<GuestList | null> {
    return this.guestListsService.findByShareToken(token);
  }

  @Get('code/:code')
  async findByAccessCode(@Param('code') code: string): Promise<GuestList | null> {
    return this.guestListsService.findByAccessCode(code);
  }

  @Get('arrival/:token')
  async findByArrivalToken(@Param('token') token: string): Promise<GuestList | null> {
    return this.guestListsService.findByArrivalToken(token);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<GuestList | null> {
    return this.guestListsService.findOne(id);
  }

  @Post()
  async create(@Body() guestList: Partial<GuestList>): Promise<GuestList> {
    return this.guestListsService.create(guestList);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() guestList: Partial<GuestList>,
  ): Promise<GuestList | null> {
    return this.guestListsService.update(id, guestList);
  }

  @Post(':id/lock')
  async lock(@Param('id', ParseIntPipe) id: number): Promise<GuestList | null> {
    return this.guestListsService.lock(id);
  }

  @Post(':id/unlock')
  async unlock(@Param('id', ParseIntPipe) id: number): Promise<GuestList | null> {
    return this.guestListsService.unlock(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.guestListsService.delete(id);
  }

  // Guest endpoints
  @Post(':id/guests')
  async addGuest(
    @Param('id', ParseIntPipe) guestListId: number,
    @Body() guest: Partial<Guest>,
  ): Promise<Guest> {
    return this.guestListsService.addGuest(guestListId, guest);
  }

  @Put('guests/:guestId')
  async updateGuest(
    @Param('guestId', ParseIntPipe) guestId: number,
    @Body() guest: Partial<Guest>,
  ): Promise<Guest | null> {
    return this.guestListsService.updateGuest(guestId, guest);
  }

  @Delete('guests/:guestId')
  async deleteGuest(@Param('guestId', ParseIntPipe) guestId: number): Promise<void> {
    return this.guestListsService.deleteGuest(guestId);
  }

  @Post('guests/:guestId/arrive')
  async markArrival(@Param('guestId', ParseIntPipe) guestId: number): Promise<Guest | null> {
    return this.guestListsService.markArrival(guestId);
  }

  @Post('guests/:guestId/unarrive')
  async unmarkArrival(@Param('guestId', ParseIntPipe) guestId: number): Promise<Guest | null> {
    return this.guestListsService.unmarkArrival(guestId);
  }
}
