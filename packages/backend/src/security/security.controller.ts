import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { SecurityService } from './security.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('security')
export class SecurityController {
  constructor(
    private readonly securityService: SecurityService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization?: string): string {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    return authorization.replace('Bearer ', '');
  }

  private async getOwnerId(authorization?: string): Promise<string> {
    const token = this.extractToken(authorization);
    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      if (userId) return userId;
      throw new UnauthorizedException('Invalid dev token');
    }
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  @Get()
  async findAll(
    @Headers('authorization') authorization: string,
    @Query('eventId') eventId?: string,
  ): Promise<any[]> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    if (eventId) {
      return this.securityService.findByEvent(supabase, ownerId, eventId);
    }
    return this.securityService.findAll(supabase, ownerId);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<any> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.securityService.findOne(supabase, ownerId, id);
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() body: any,
  ): Promise<any> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.securityService.create(supabase, ownerId, body);
  }

  @Put(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any,
  ): Promise<any> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.securityService.update(supabase, ownerId, id, body);
  }

  @Post(':id/arrival')
  async recordArrival(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<any> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.securityService.recordArrival(supabase, ownerId, id);
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<void> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.securityService.remove(supabase, ownerId, id);
  }
}
