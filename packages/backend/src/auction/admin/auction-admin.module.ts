import { Module } from '@nestjs/common';
import { AuctionAdminController } from './auction-admin.controller';
import { AuctionAdminService } from './auction-admin.service';
import { AuctionReportsService } from './auction-reports.service';
import { AuctionUploadController } from './auction-upload.controller';

// AUCTION_ORDER_CHARGER is optional here; the importing module (payments) supplies it at wiring time.
@Module({
  controllers: [AuctionAdminController, AuctionUploadController],
  providers: [AuctionAdminService, AuctionReportsService],
  exports: [AuctionAdminService],
})
export class AuctionAdminModule {}
