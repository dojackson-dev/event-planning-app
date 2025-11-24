import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { SecurityService } from './security.service';
import { Security } from '../entities/security.entity';

@Controller('security')
export class SecurityController {
  constructor(private readonly securityService: SecurityService) {}

  @Get()
  async findAll(@Query('eventId') eventId?: string): Promise<Security[]> {
    if (eventId) {
      return this.securityService.findByEvent(parseInt(eventId));
    }
    return this.securityService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Security | null> {
    return this.securityService.findOne(id);
  }

  @Post()
  async create(@Body() security: Partial<Security>): Promise<Security> {
    return this.securityService.create(security);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() security: Partial<Security>,
  ): Promise<Security | null> {
    return this.securityService.update(id, security);
  }

  @Post(':id/arrival')
  async recordArrival(@Param('id', ParseIntPipe) id: number): Promise<Security | null> {
    return this.securityService.recordArrival(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.securityService.delete(id);
  }
}
