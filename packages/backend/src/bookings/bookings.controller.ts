import { Controller, Get, Post, Body, Patch, Param, Delete, Headers, UnauthorizedException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { Booking } from '../entities/booking.entity';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
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
    @Body() createBookingDto: any
  ): Promise<any> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.bookingsService.create(supabaseWithAuth, { ...createBookingDto, userId });
  }

  @Get()
  async findAll(@Headers('authorization') authorization: string): Promise<any[]> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.bookingsService.findAll(supabaseWithAuth);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id') id: string
  ): Promise<any | null> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.bookingsService.findOne(supabaseWithAuth, id);
  }

  @Patch(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() updateBookingDto: any
  ): Promise<any | null> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.bookingsService.update(supabaseWithAuth, id, updateBookingDto);
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') authorization: string,
    @Param('id') id: string
  ): Promise<void> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    return this.bookingsService.remove(supabaseWithAuth, id);
  }
}
