import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { MessagingModule } from '../../messaging/messaging.module';
import { AuctionBiddingService } from './auction-bidding.service';
import { AuctionOtpDelivery } from './auction-otp-delivery.service';
import { AuctionPublicController } from './auction-public.controller';
import { AuctionPublicService } from './auction-public.service';
import { AuctionsEnabledGuard } from './auctions-enabled.guard';
import { BidderAuthService } from './bidder-auth.service';
import { BidderGuard } from './bidder.guard';
import { BidderOtpService } from './bidder-otp.service';
import { BidderRegistrationService } from './bidder-registration.service';
import { clientIp } from './client-ip';

/**
 * Slice D's payments module provides AUCTION_ORDER_CHARGER; the lead must make it
 * visible here (import it, or export it from a global module). Without it,
 * buy-now/purchase create the order and return `charge: null`.
 */
@Module({
  imports: [
    ConfigModule,
    MessagingModule,
    // Not registered as APP_GUARD: ThrottlerGuard is applied only by AuctionPublicController.
    ThrottlerModule.forRoot({
      throttlers: [{ name: 'default', ttl: 60_000, limit: 600 }],
      getTracker: (req) => clientIp(req),
    }),
  ],
  controllers: [AuctionPublicController],
  providers: [
    AuctionsEnabledGuard,
    BidderAuthService,
    BidderGuard,
    AuctionOtpDelivery,
    BidderOtpService,
    AuctionPublicService,
    BidderRegistrationService,
    AuctionBiddingService,
  ],
  exports: [BidderAuthService, BidderGuard],
})
export class AuctionBiddingModule {}
