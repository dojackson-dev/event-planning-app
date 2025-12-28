import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, UnauthorizedException } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from '../entities/event.entity';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('events')
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private async getUserId(authorization?: string): Promise<string> {
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabaseWithAuth.auth.getUser(token);
    
    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    
    return user.id;
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() createEventDto: any
  ): Promise<any> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.eventsService.create(supabaseWithAuth, { ...createEventDto, ownerId: userId });
  }

  @Get()
  async findAll(@Headers('authorization') authorization: string): Promise<any[]> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.eventsService.findAll(supabaseWithAuth);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id') id: string
  ): Promise<any | null> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.eventsService.findOne(supabaseWithAuth, id);
  }

  @Patch(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() updateEventDto: any
  ): Promise<any | null> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.eventsService.update(supabaseWithAuth, id, updateEventDto);
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') authorization: string,
    @Param('id') id: string
  ): Promise<void> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.eventsService.remove(supabaseWithAuth, id);
  }
}
