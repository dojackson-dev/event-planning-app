import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ArtistBookingsService } from './artist-bookings.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateArtistBookingDto, UpdateArtistBookingDto } from './dto/artist-booking.dto';

@Controller('artist-bookings')
export class ArtistBookingsController {
  private readonly logger = new Logger(ArtistBookingsController.name);

  constructor(
    private readonly artistBookingsService: ArtistBookingsService,
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

  /** POST /artist-bookings */
  @Post()
  async createBooking(@Headers('authorization') auth: string, @Body() dto: CreateArtistBookingDto) {
    const userId = await this.getUserId(auth);
    return this.artistBookingsService.createBooking(userId, dto);
  }

  /** GET /artist-bookings/mine */
  @Get('mine')
  async listBookings(@Headers('authorization') auth: string) {
    const userId = await this.getUserId(auth);
    return this.artistBookingsService.listBookings(userId);
  }

  /** GET /artist-bookings/:id */
  @Get(':id')
  async getBooking(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.artistBookingsService.getBooking(userId, id);
  }

  /** PUT /artist-bookings/:id */
  @Put(':id')
  async updateBooking(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdateArtistBookingDto,
  ) {
    const userId = await this.getUserId(auth);
    return this.artistBookingsService.updateBooking(userId, id, dto);
  }

  /** DELETE /artist-bookings/:id */
  @Delete(':id')
  async deleteBooking(@Headers('authorization') auth: string, @Param('id') id: string) {
    const userId = await this.getUserId(auth);
    return this.artistBookingsService.deleteBooking(userId, id);
  }
}
