import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { ListingPhotosService } from './listing-photos.service';

/** Photo management for vendor portfolios and venues. Public listings get their photos from the same service. */
@Controller('listing-photos')
export class ListingPhotosController {
  constructor(
    private readonly photos: ListingPhotosService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization)
      throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const {
      data: { user },
      error,
    } = await this.supabaseService.setAuthContext(token).auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  @Get('vendor')
  async listVendor(@Headers('authorization') authorization: string) {
    return this.photos.listVendorPhotos(await this.getUserId(authorization));
  }

  @Post('vendor')
  async addVendor(
    @Headers('authorization') authorization: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    return this.photos.addVendorPhoto(
      await this.getUserId(authorization),
      imageUrl,
    );
  }

  @Delete('vendor/:photoId')
  async deleteVendor(
    @Headers('authorization') authorization: string,
    @Param('photoId') photoId: string,
  ) {
    return this.photos.deleteVendorPhoto(
      await this.getUserId(authorization),
      photoId,
    );
  }

  @Get('venue/:venueId')
  async listVenue(
    @Headers('authorization') authorization: string,
    @Param('venueId') venueId: string,
  ) {
    return this.photos.listVenuePhotos(
      await this.getUserId(authorization),
      venueId,
    );
  }

  @Post('venue/:venueId')
  async addVenue(
    @Headers('authorization') authorization: string,
    @Param('venueId') venueId: string,
    @Body('imageUrl') imageUrl: string,
  ) {
    return this.photos.addVenuePhoto(
      await this.getUserId(authorization),
      venueId,
      imageUrl,
    );
  }

  @Delete('venue/:venueId/:photoId')
  async deleteVenue(
    @Headers('authorization') authorization: string,
    @Param('venueId') venueId: string,
    @Param('photoId') photoId: string,
  ) {
    return this.photos.deleteVenuePhoto(
      await this.getUserId(authorization),
      venueId,
      photoId,
    );
  }
}
