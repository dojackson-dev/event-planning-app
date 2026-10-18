import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuctionBiddingService } from './auction-bidding.service';
import { AuctionPublicService } from './auction-public.service';
import { AuctionsEnabledGuard } from './auctions-enabled.guard';
import { BidderGuard, CurrentBidder, readBidderToken } from './bidder.guard';
import type { BidderContext } from './bidder.guard';
import { BidderAuthService } from './bidder-auth.service';
import { BidderRegistrationService } from './bidder-registration.service';
import { clientIp } from './client-ip';
import { parsePlaceBid, parsePurchase } from './dto/bid.dto';
import { parseUuidParam } from './dto/common';
import {
  parseLoginStart,
  parseLoginVerify,
  parseRegisterStart,
  parseResend,
  parseVerify,
} from './dto/register.dto';

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

const MINUTE = 60_000;

/** Public auction API. Every route 404s unless AUCTIONS_ENABLED=true; limits are per client IP (the DB enforces the rest). */
@Controller('auctions/public')
@UseGuards(AuctionsEnabledGuard, ThrottlerGuard)
export class AuctionPublicController {
  constructor(
    private readonly publicAuctions: AuctionPublicService,
    private readonly registration: BidderRegistrationService,
    private readonly bidding: AuctionBiddingService,
    private readonly auth: BidderAuthService,
  ) {}

  // ---- reads (no auth) ----

  @Get()
  list() {
    return this.publicAuctions.listAuctions();
  }

  // Literal-prefixed routes are declared before the `:auctionId` routes.
  @Get('items/:itemId')
  item(@Param('itemId') itemId: string) {
    return this.publicAuctions.getItem(parseUuidParam(itemId));
  }

  @Get('bidder/me')
  @UseGuards(BidderGuard)
  me(@CurrentBidder() bidder: BidderContext) {
    return this.bidding.getMe(bidder);
  }

  @Get('bidder/orders')
  @UseGuards(BidderGuard)
  orders(@CurrentBidder() bidder: BidderContext) {
    return this.bidding.getOrders(bidder);
  }

  @Post('items/:itemId/bids')
  @HttpCode(200)
  @UseGuards(BidderGuard)
  @Throttle({ default: { limit: 120, ttl: MINUTE } })
  placeBid(
    @CurrentBidder() bidder: BidderContext,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    return this.bidding.placeBid(
      bidder,
      parseUuidParam(itemId),
      parsePlaceBid(body),
    );
  }

  @Post('items/:itemId/buy-now')
  @HttpCode(200)
  @UseGuards(BidderGuard)
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  buyNow(
    @CurrentBidder() bidder: BidderContext,
    @Param('itemId') itemId: string,
  ) {
    return this.bidding.buyNow(bidder, parseUuidParam(itemId));
  }

  @Post('items/:itemId/purchase')
  @HttpCode(200)
  @UseGuards(BidderGuard)
  @Throttle({ default: { limit: 20, ttl: MINUTE } })
  purchase(
    @CurrentBidder() bidder: BidderContext,
    @Param('itemId') itemId: string,
    @Body() body: unknown,
  ) {
    return this.bidding.purchase(
      bidder,
      parseUuidParam(itemId),
      parsePurchase(body).quantity,
    );
  }

  @Get(':auctionId')
  auction(@Param('auctionId') auctionId: string) {
    return this.publicAuctions.getAuction(parseUuidParam(auctionId));
  }

  /** Polling endpoint: cached ~1s for anonymous callers; a valid bidder token adds `you_are_leading`. */
  @Get(':auctionId/state')
  async state(@Param('auctionId') auctionId: string, @Req() req: RequestLike) {
    let bidder: BidderContext | null = null;
    const token = readBidderToken(req);
    if (token) {
      try {
        bidder = await this.auth.tryAuthenticate(token);
      } catch {
        bidder = null;
      }
    }
    return this.publicAuctions.getState(parseUuidParam(auctionId), bidder);
  }

  // ---- registration and login ----

  @Post(':auctionId/register/start')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 10 * MINUTE } })
  registerStart(
    @Param('auctionId') auctionId: string,
    @Body() body: unknown,
    @Req() req: RequestLike,
  ) {
    return this.registration.start(
      parseUuidParam(auctionId),
      parseRegisterStart(body),
      clientIp(req),
    );
  }

  @Post(':auctionId/register/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 10 * MINUTE } })
  registerVerify(@Param('auctionId') auctionId: string, @Body() body: unknown) {
    return this.registration.verify(
      parseUuidParam(auctionId),
      parseVerify(body),
    );
  }

  @Post(':auctionId/register/resend')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 10 * MINUTE } })
  registerResend(
    @Param('auctionId') auctionId: string,
    @Body() body: unknown,
    @Req() req: RequestLike,
  ) {
    return this.registration.resend(
      parseUuidParam(auctionId),
      parseResend(body),
      clientIp(req),
    );
  }

  @Post(':auctionId/login/start')
  @HttpCode(200)
  @Throttle({ default: { limit: 30, ttl: 10 * MINUTE } })
  loginStart(
    @Param('auctionId') auctionId: string,
    @Body() body: unknown,
    @Req() req: RequestLike,
  ) {
    return this.registration.loginStart(
      parseUuidParam(auctionId),
      parseLoginStart(body).email,
      clientIp(req),
    );
  }

  @Post(':auctionId/login/verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 10 * MINUTE } })
  loginVerify(@Param('auctionId') auctionId: string, @Body() body: unknown) {
    const { email, code } = parseLoginVerify(body);
    return this.registration.loginVerify(
      parseUuidParam(auctionId),
      email,
      code,
    );
  }
}
