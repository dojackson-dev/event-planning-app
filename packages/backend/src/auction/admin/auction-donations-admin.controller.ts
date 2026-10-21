import {
  Body,
  Controller,
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
import { AuctionDonationsAdminService } from './auction-donations-admin.service';

/** Organizer review of item donations. Registered before AuctionAdminController (see AuctionAdminModule). */
@Controller('auctions/manage')
export class AuctionDonationsAdminController {
  constructor(
    private readonly service: AuctionDonationsAdminService,
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

  @Get(':id/donations')
  async list(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status?: string,
  ) {
    return this.service.list(
      await this.userId(authorization, 'read'),
      id,
      status,
    );
  }

  @Put('donations/:donationId')
  async update(
    @Headers('authorization') authorization: string,
    @Param('donationId', ParseUUIDPipe) donationId: string,
    @Body() dto: unknown,
  ) {
    return this.service.update(
      await this.userId(authorization, 'write'),
      donationId,
      dto,
    );
  }

  @Post('donations/:donationId/approve')
  async approve(
    @Headers('authorization') authorization: string,
    @Param('donationId', ParseUUIDPipe) donationId: string,
    @Body() dto: unknown,
  ) {
    return this.service.approve(
      await this.userId(authorization, 'write'),
      donationId,
      dto,
    );
  }

  @Post('donations/:donationId/decline')
  async decline(
    @Headers('authorization') authorization: string,
    @Param('donationId', ParseUUIDPipe) donationId: string,
    @Body() dto: unknown,
  ) {
    return this.service.decline(
      await this.userId(authorization, 'write'),
      donationId,
      dto,
    );
  }
}
