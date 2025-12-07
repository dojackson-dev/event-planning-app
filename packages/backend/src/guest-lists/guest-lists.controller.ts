import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { GuestListsService } from './guest-lists.service';

@Controller('guest-lists')
export class GuestListsController {
  constructor(private readonly guestListsService: GuestListsService) {}

  @Get()
  async findAll(@Query('clientId') clientId?: string): Promise<any[]> {
    if (clientId) {
      return this.guestListsService.findByClient(clientId);
    }
    return this.guestListsService.findAll();
  }

  @Get('by-event/:eventId')
  async findByEvent(@Param('eventId', ParseIntPipe) eventId: number): Promise<any | null> {
    return this.guestListsService.findByEvent(eventId);
  }

  @Get('share/:token')
  async findByShareToken(@Param('token') token: string): Promise<any | null> {
    return this.guestListsService.findByShareToken(token);
  }

  @Get('code/:code')
  async findByAccessCode(@Param('code') code: string): Promise<any | null> {
    return this.guestListsService.findByAccessCode(code);
  }

  @Get('arrival/:token')
  async findByArrivalToken(@Param('token') token: string): Promise<any | null> {
    return this.guestListsService.findByArrivalToken(token);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<any | null> {
    return this.guestListsService.findOne(id);
  }

  @Post()
  async create(@Body() guestList: any): Promise<any> {
    console.log('Received guest list data:', JSON.stringify(guestList, null, 2));
    return this.guestListsService.create(guestList);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() guestList: any,
  ): Promise<any | null> {
    return this.guestListsService.update(id, guestList);
  }

  @Post(':id/lock')
  async lock(@Param('id', ParseIntPipe) id: number): Promise<any | null> {
    return this.guestListsService.lock(id);
  }

  @Post(':id/unlock')
  async unlock(@Param('id', ParseIntPipe) id: number): Promise<any | null> {
    return this.guestListsService.unlock(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.guestListsService.delete(id);
  }

  // Guest endpoints
  @Get(':id/guests')
  async getGuests(@Param('id', ParseIntPipe) guestListId: number): Promise<any[]> {
    return this.guestListsService.getGuests(guestListId);
  }

  @Post(':id/guests')
  async addGuest(
    @Param('id', ParseIntPipe) guestListId: number,
    @Body() guest: any,
  ): Promise<any> {
    return this.guestListsService.addGuest(guestListId, guest);
  }

  @Put('guests/:guestId')
  async updateGuest(
    @Param('guestId', ParseIntPipe) guestId: number,
    @Body() guest: any,
  ): Promise<any | null> {
    return this.guestListsService.updateGuest(guestId, guest);
  }

  @Delete('guests/:guestId')
  async deleteGuest(@Param('guestId', ParseIntPipe) guestId: number): Promise<void> {
    return this.guestListsService.deleteGuest(guestId);
  }

  @Post('guests/:guestId/arrive')
  async markArrival(@Param('guestId', ParseIntPipe) guestId: number): Promise<any | null> {
    return this.guestListsService.markArrival(guestId);
  }

  @Post('guests/:guestId/unarrive')
  async unmarkArrival(@Param('guestId', ParseIntPipe) guestId: number): Promise<any | null> {
    return this.guestListsService.unmarkArrival(guestId);
  }
}
