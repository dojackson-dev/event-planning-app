import { Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { IntakeFormsService } from './intake-forms.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('intake-forms')
export class IntakeFormsController {
  constructor(
    private readonly intakeFormsService: IntakeFormsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private async getUserId(authorization: string): Promise<string> {
    const token = this.extractToken(authorization);
    
    // Handle dev tokens (local-<uuid> format)
    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      if (userId) return userId;
      throw new UnauthorizedException('Invalid dev token format');
    }
    
    // Handle Supabase tokens
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabaseWithAuth.auth.getUser(token);
    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }
    return user.id;
  }

  @Post()
  async create(@Headers('authorization') authorization: string, @Body() createDto: any) {
    try {
      console.log('Received intake form data:', JSON.stringify(createDto, null, 2));
      const token = this.extractToken(authorization);
      const userId = await this.getUserId(authorization);
      const supabaseWithAuth = this.supabaseService.setAuthContext(token);
      const result = await this.intakeFormsService.create(supabaseWithAuth, userId, createDto);
      console.log('Successfully created intake form:', result);
      return result;
    } catch (error) {
      console.error('Error creating intake form:', error);
      throw error;
    }
  }

  @Get()
  async findAll(@Headers('authorization') authorization: string) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.findAll(supabaseWithAuth, userId);
  }

  @Get(':id')
  async findOne(@Headers('authorization') authorization: string, @Param('id') id: string) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.findOne(supabaseWithAuth, userId, id);
  }

  @Put(':id')
  async update(@Headers('authorization') authorization: string, @Param('id') id: string, @Body() updateDto: any) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.update(supabaseWithAuth, userId, id, updateDto);
  }

  @Delete(':id')
  async remove(@Headers('authorization') authorization: string, @Param('id') id: string) {
    const token = this.extractToken(authorization);
    const userId = await this.getUserId(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.intakeFormsService.remove(supabaseWithAuth, userId, id);
  }

  @Post(':id/convert-to-booking')
  async convertToBooking(@Headers('authorization') authorization: string, @Param('id') id: string) {
    try {
      console.log('Converting intake form to booking:', id);
      const token = this.extractToken(authorization);
      const userId = await this.getUserId(authorization);
      console.log('User ID:', userId);
      const supabaseWithAuth = this.supabaseService.setAuthContext(token);
      const result = await this.intakeFormsService.convertToBooking(supabaseWithAuth, userId, id);
      console.log('Successfully converted to booking:', result);
      return result;
    } catch (error) {
      console.error('Error converting to booking:', error);
      throw error;
    }
  }
}
