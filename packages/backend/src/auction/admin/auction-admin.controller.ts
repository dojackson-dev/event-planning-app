import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  PromoterAccessPolicy,
  PromoterAccessService,
} from '../../promoter-team/promoter-access.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { resolveAdminUserId } from './admin-auth';
import { AuctionAdminService } from './auction-admin.service';
import { AuctionReportsService } from './auction-reports.service';
import {
  AuctionItemDto,
  BlockBidderDto,
  CreateAuctionDto,
  MarkPaidOfflineDto,
  ResolveReserveDto,
  UpdateAuctionDto,
} from './dto/auction.dto';

/** GETs resolve with the 'read' policy (admin + staff); mutations with 'write' (admin only). */
@Controller('auctions/manage')
export class AuctionAdminController {
  constructor(
    private readonly service: AuctionAdminService,
    private readonly reports: AuctionReportsService,
    private readonly supabaseService: SupabaseService,
    private readonly access: PromoterAccessService,
  ) {}

  private getUserId(
    authorization: string,
    policy: PromoterAccessPolicy,
  ): Promise<string> {
    return resolveAdminUserId(
      this.supabaseService,
      this.access,
      authorization,
      policy,
    );
  }

  // ─── auctions ────────────────────────────────────────────────

  @Get()
  async list(@Headers('authorization') authorization: string) {
    return this.service.listAuctions(
      await this.getUserId(authorization, 'read'),
    );
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() dto: CreateAuctionDto,
  ) {
    return this.service.createAuction(
      await this.getUserId(authorization, 'write'),
      dto,
    );
  }

  @Get(':id')
  async get(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.getAuction(
      await this.getUserId(authorization, 'read'),
      id,
    );
  }

  @Put(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAuctionDto,
  ) {
    return this.service.updateAuction(
      await this.getUserId(authorization, 'write'),
      id,
      dto,
    );
  }

  @Post(':id/publish')
  async publish(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.publishAuction(
      await this.getUserId(authorization, 'write'),
      id,
    );
  }

  @Post(':id/cancel')
  async cancel(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.cancelAuction(
      await this.getUserId(authorization, 'write'),
      id,
    );
  }

  // ─── items ───────────────────────────────────────────────────

  @Post(':id/items')
  async createItem(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AuctionItemDto,
  ) {
    return this.service.createItem(
      await this.getUserId(authorization, 'write'),
      id,
      dto,
    );
  }

  @Put('items/:itemId')
  async updateItem(
    @Headers('authorization') authorization: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: AuctionItemDto,
  ) {
    return this.service.updateItem(
      await this.getUserId(authorization, 'write'),
      itemId,
      dto,
    );
  }

  @Delete('items/:itemId')
  async deleteItem(
    @Headers('authorization') authorization: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.service.deleteItem(
      await this.getUserId(authorization, 'write'),
      itemId,
    );
  }

  @Post('items/:itemId/withdraw')
  async withdrawItem(
    @Headers('authorization') authorization: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ) {
    return this.service.withdrawItem(
      await this.getUserId(authorization, 'write'),
      itemId,
    );
  }

  @Post('items/:itemId/resolve-reserve')
  async resolveReserve(
    @Headers('authorization') authorization: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: ResolveReserveDto,
  ) {
    return this.service.resolveReserve(
      await this.getUserId(authorization, 'write'),
      itemId,
      dto,
    );
  }

  // ─── bidder and order actions ────────────────────────────────

  @Post('bidders/:bidderId/block')
  async blockBidder(
    @Headers('authorization') authorization: string,
    @Param('bidderId', ParseUUIDPipe) bidderId: string,
    @Body() dto: BlockBidderDto,
  ) {
    return this.service.blockBidder(
      await this.getUserId(authorization, 'write'),
      bidderId,
      dto,
    );
  }

  @Post('bidders/:bidderId/unblock')
  async unblockBidder(
    @Headers('authorization') authorization: string,
    @Param('bidderId', ParseUUIDPipe) bidderId: string,
  ) {
    return this.service.unblockBidder(
      await this.getUserId(authorization, 'write'),
      bidderId,
    );
  }

  @Post('orders/:orderId/retry-charge')
  async retryCharge(
    @Headers('authorization') authorization: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.service.retryCharge(
      await this.getUserId(authorization, 'write'),
      orderId,
    );
  }

  @Post('orders/:orderId/send-pay-link')
  async sendPayLink(
    @Headers('authorization') authorization: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.service.sendPayLink(
      await this.getUserId(authorization, 'write'),
      orderId,
    );
  }

  @Post('orders/:orderId/mark-paid-offline')
  async markPaidOffline(
    @Headers('authorization') authorization: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() dto: MarkPaidOfflineDto,
  ) {
    return this.service.markPaidOffline(
      await this.getUserId(authorization, 'write'),
      orderId,
      dto,
    );
  }

  @Post('orders/:orderId/cancel')
  async cancelOrder(
    @Headers('authorization') authorization: string,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.service.cancelOrder(
      await this.getUserId(authorization, 'write'),
      orderId,
    );
  }

  // ─── reports ─────────────────────────────────────────────────

  @Get(':id/summary')
  async summary(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reports.summary(
      await this.getUserId(authorization, 'read'),
      id,
    );
  }

  @Get(':id/bids')
  async bids(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reports.bids(
      await this.getUserId(authorization, 'read'),
      id,
      limit,
      offset,
    );
  }

  @Get(':id/bidders')
  async bidders(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reports.bidders(
      await this.getUserId(authorization, 'read'),
      id,
      limit,
      offset,
    );
  }

  @Get(':id/orders')
  async orders(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.reports.orders(
      await this.getUserId(authorization, 'read'),
      id,
      limit,
      offset,
    );
  }

  @Get(':id/export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="auction-export.csv"')
  @Header('Cache-Control', 'no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  async exportCsv(
    @Headers('authorization') authorization: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('type') type?: string,
  ) {
    return this.reports.exportCsv(
      await this.getUserId(authorization, 'read'),
      id,
      type,
    );
  }
}
