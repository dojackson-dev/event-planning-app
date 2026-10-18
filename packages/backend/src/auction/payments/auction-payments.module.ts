import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessagingModule } from '../../messaging/messaging.module';
import { AUCTION_ORDER_CHARGER } from '../auction-ports';
import { AuctionBiddingModule } from '../bidding/auction-bidding.module';
import { AuctionCardController } from './auction-card.controller';
import { AuctionCloserService } from './auction-closer.service';
import { AuctionMailService } from './auction-mail.service';
import { AuctionNotificationsService } from './auction-notifications.service';
import { AuctionPayController } from './auction-pay.controller';
import { AuctionPaymentsService } from './auction-payments.service';
import { AuctionSmsService } from './auction-sms.service';

// Global so the admin and bidding modules can inject AUCTION_ORDER_CHARGER without a circular import.
// Must not import StripeModule: StripeModule imports this module (same direction as NonprofitModule).
@Global()
@Module({
  imports: [ConfigModule, MessagingModule, AuctionBiddingModule],
  controllers: [AuctionCardController, AuctionPayController],
  providers: [
    AuctionMailService,
    AuctionSmsService,
    AuctionPaymentsService,
    AuctionNotificationsService,
    AuctionCloserService,
    { provide: AUCTION_ORDER_CHARGER, useExisting: AuctionPaymentsService },
  ],
  exports: [AuctionPaymentsService, AUCTION_ORDER_CHARGER],
})
export class AuctionPaymentsModule {}
