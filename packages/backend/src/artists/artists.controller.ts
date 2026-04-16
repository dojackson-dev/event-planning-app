import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ArtistsService } from './artists.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateArtistDto, UpdateArtistDto } from './dto/artist.dto';

@Controller('artists')
export class ArtistsController {
  private readonly logger = new Logger(ArtistsController.name);

  constructor(
    private readonly artistsService: ArtistsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  // ─────────────────────────────────────────────
  // AUTH HELPER
  // ─────────────────────────────────────────────

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');

    if (token.startsWith('local-')) {
      return token.replace('local-', '');
    }

    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ─────────────────────────────────────────────
  // PUBLIC ROUTES
  // ─────────────────────────────────────────────

  /** GET /artists/types */
  @Get('types')
  getArtistTypes() {
    return this.artistsService.getArtistTypes();
  }

  /**
   * GET /artists/search?artistType=&genre=&location=&availableForBooking=
   * Artist directory for owners/promoters discovering talent
   */
  @Get('search')
  async searchArtists(
    @Query('artistType') artistType: string,
    @Query('genre') genre: string,
    @Query('location') location: string,
    @Query('availableForBooking') availableForBooking: string,
  ) {
    return this.artistsService.searchArtists({
      artistType: artistType || undefined,
      genre: genre || undefined,
      location: location || undefined,
      availableForBooking: availableForBooking !== undefined ? availableForBooking === 'true' : undefined,
    });
  }

  /** GET /artists/:id — public artist profile */
  @Get(':id')
  async getArtistById(@Param('id') id: string) {
    return this.artistsService.getArtistById(id);
  }

  // ─────────────────────────────────────────────
  // AUTHENTICATED ROUTES (artist portal)
  // ─────────────────────────────────────────────

  /**
   * POST /artists/register
   */
  @Post('register')
  async register(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateArtistDto,
  ) {
    const userId = await this.getUserId(authorization);
    return this.artistsService.createArtistAccount(userId, dto);
  }

  /**
   * GET /artists/me/profile
   */
  @Get('me/profile')
  async getMyProfile(
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);
    return this.artistsService.getArtistProfile(userId);
  }

  /**
   * PUT /artists/me/profile
   */
  @Put('me/profile')
  async updateMyProfile(
    @Headers('authorization') authorization: string,
    @Body() dto: UpdateArtistDto,
  ) {
    const userId = await this.getUserId(authorization);
    return this.artistsService.updateArtistProfile(userId, dto);
  }

  // ─────────────────────────────────────────────
  // RIDER
  // ─────────────────────────────────────────────

  /** GET /artists/me/rider */
  @Get('me/rider')
  async getMyRider(@Headers('authorization') authorization: string) {
    const userId = await this.getUserId(authorization);
    return this.artistsService.getRider(userId);
  }

  /** PUT /artists/me/rider */
  @Put('me/rider')
  async upsertMyRider(
    @Headers('authorization') authorization: string,
    @Body() dto: any,
  ) {
    const userId = await this.getUserId(authorization);
    return this.artistsService.upsertRider(userId, dto);
  }

  /** GET /artists/:id/rider — public rider view */
  @Get(':id/rider')
  async getPublicRider(@Param('id') id: string) {
    return this.artistsService.getPublicRider(id);
  }
}
