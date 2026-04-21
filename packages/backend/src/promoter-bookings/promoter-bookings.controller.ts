import {
  Controller, Get, Post, Put, Delete, Body, Param, Headers, UnauthorizedException, Logger,
} from '@nestjs/common';
import { PromoterBookingsService } from './promoter-bookings.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePromoterBookingDto, UpdatePromoterBookingDto } from './dto/promoter-booking.dto';

@Controller('promoter-bookings')
export class PromoterBookingsController {
  private readonly logger = new Logger(PromoterBookingsController.name);

  constructor(
    private readonly promoterBookingsService: PromoterBookingsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    if (token.startsWith('local-')) return token.replace('local-', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  @Post()
  async createBooking(@Headers('authorization') auth: string, @Body() dto: CreatePromoterBookingDto) {
    const userId = await this.getUserId(auth);
    return this.promoterBookingsService.createBooking(userId, dto);
  }

  @Get('mine')
  async listBookings(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    return this.promoterBookingsService.listBookings(userId);
  }

  @Get(':id')
  async getBooking(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.promoterBookingsService.getBooking(userId, id);
  }

  @Put(':id')
  async updateBooking(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromoterBookingDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.promoterBookingsService.updateBooking(userId, id, dto);
  }

  @Delete(':id')
  async deleteBooking(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.promoterBookingsService.deleteBooking(userId, id);
  }
}
