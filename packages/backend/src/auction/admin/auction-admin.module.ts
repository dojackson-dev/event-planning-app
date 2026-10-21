import { Module } from '@nestjs/common';
import { AuctionAdminController } from './auction-admin.controller';
import { AuctionAdminService } from './auction-admin.service';
import { AuctionDonationsAdminController } from './auction-donations-admin.controller';
import { AuctionDonationsAdminService } from './auction-donations-admin.service';
import { AuctionOrgController } from './auction-org.controller';
import { AuctionOrgService } from './auction-org.service';
import { AuctionReportsService } from './auction-reports.service';
import { AuctionUploadController } from './auction-upload.controller';

// AUCTION_ORDER_CHARGER is optional here; the importing module (payments) supplies it at wiring time.
// The org and donation controllers come first: their literal paths (`organization`, `donations/...`) must
// win over AuctionAdminController's `:id` routes.
@Module({
  controllers: [
    AuctionOrgController,
    AuctionDonationsAdminController,
    AuctionAdminController,
    AuctionUploadController,
  ],
  providers: [
    AuctionAdminService,
    AuctionReportsService,
    AuctionOrgService,
    AuctionDonationsAdminService,
  ],
  exports: [AuctionAdminService],
})
export class AuctionAdminModule {}
