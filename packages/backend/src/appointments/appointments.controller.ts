import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private async getOwnerId(authorization?: string): Promise<string> {
    const token = this.extractToken(authorization);

    // Handle dev tokens (local-<uuid> format)
    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      if (userId) return userId;
      throw new UnauthorizedException('Invalid dev token format');
    }

    // Handle Supabase tokens
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabaseWithAuth.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user.id;
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() createDto: any,
  ): Promise<any> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.appointmentsService.create(supabase, ownerId, createDto);
  }

  @Get()
  async findAll(
    @Headers('authorization') authorization: string,
  ): Promise<any[]> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.appointmentsService.findAll(supabase, ownerId);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<any> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.appointmentsService.findOne(supabase, ownerId, id);
  }

  @Patch(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() updateDto: any,
  ): Promise<any> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.appointmentsService.update(supabase, ownerId, id, updateDto);
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<any> {
    const ownerId = await this.getOwnerId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.appointmentsService.remove(supabase, ownerId, id);
  }
}
