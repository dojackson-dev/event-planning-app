import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { PromoterAccessService } from '../../promoter-team/promoter-access.service';
import type { PromoterAccessPolicy } from '../../promoter-team/promoter-access.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { resolveAdminUserId } from './admin-auth';
import { AuctionOrgService } from './auction-org.service';

/**
 * Organization profile, gallery and sponsors for the signed-in promoter.
 * Registered before AuctionAdminController so `organization` is never read as an auction `:id`.
 */
@Controller('auctions/manage')
export class AuctionOrgController {
  constructor(
    private readonly service: AuctionOrgService,
    private readonly supabaseService: SupabaseService,
    private readonly access: PromoterAccessService,
  ) {}

  private userId(authorization: string, policy: PromoterAccessPolicy) {
    return resolveAdminUserId(
      this.supabaseService,
      this.access,
      authorization,
      policy,
    );
  }

  @Get('organization')
  async get(@Headers('authorization') authorization: string) {
    return this.service.getMine(await this.userId(authorization, 'read'));
  }

  @Put('organization')
  async upsert(
    @Headers('authorization') authorization: string,
    @Body() dto: unknown,
  ) {
    return this.service.upsert(await this.userId(authorization, 'write'), dto);
  }

  @Get('organization/slug-available')
  async slugAvailable(
    @Headers('authorization') authorization: string,
    @Query('slug') slug?: string,
  ) {
    return this.service.slugAvailable(
      await this.userId(authorization, 'read'),
      slug,
    );
  }

  // ─── gallery ─────────────────────────────────────────────────

  @Post('organization/gallery')
  async addGallery(
    @Headers('authorization') authorization: string,
    @Body() dto: unknown,
  ) {
    return this.service.addGalleryImage(
      await this.userId(authorization, 'write'),
      dto,
    );
  }

  @Put('organization/gallery-order')
  async orderGallery(
    @Headers('authorization') authorization: string,
    @Body() dto: unknown,
  ) {
    return this.service.reorderGallery(
      await this.userId(authorization, 'write'),
      dto,
    );
  }

  @Put('organization/gallery/:id')
  async updateGallery(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: unknown,
  ) {
    return this.service.updateGalleryImage(
      await this.userId(authorization, 'write'),
      id,
      dto,
    );
  }

  @Delete('organization/gallery/:id')
  async deleteGallery(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteGalleryImage(
      await this.userId(authorization, 'write'),
      id,
    );
  }

  // ─── sponsors ────────────────────────────────────────────────

  @Post('organization/sponsors')
  async addSponsor(
    @Headers('authorization') authorization: string,
    @Body() dto: unknown,
  ) {
    return this.service.addSponsor(
      await this.userId(authorization, 'write'),
      dto,
    );
  }

  @Put('organization/sponsors-order')
  async orderSponsors(
    @Headers('authorization') authorization: string,
    @Body() dto: unknown,
  ) {
    return this.service.reorderSponsors(
      await this.userId(authorization, 'write'),
      dto,
    );
  }

  @Put('organization/sponsors/:id')
  async updateSponsor(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: unknown,
  ) {
    return this.service.updateSponsor(
      await this.userId(authorization, 'write'),
      id,
      dto,
    );
  }

  @Delete('organization/sponsors/:id')
  async deleteSponsor(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.deleteSponsor(
      await this.userId(authorization, 'write'),
      id,
    );
  }
}
