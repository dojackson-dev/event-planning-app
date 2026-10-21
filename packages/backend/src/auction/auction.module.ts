import { Module } from '@nestjs/common';
import { AuctionAdminModule } from './admin/auction-admin.module';
import { AuctionBiddingModule } from './bidding/auction-bidding.module';
import { AuctionPaymentsModule } from './payments/auction-payments.module';

@Module({
  imports: [AuctionAdminModule, AuctionBiddingModule, AuctionPaymentsModule],
})
export class AuctionModule {}
