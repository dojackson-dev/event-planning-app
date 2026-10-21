import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BidderGuard, CurrentBidder } from '../bidding/bidder.guard';
import type { BidderContext } from '../bidding/bidder.guard';
import { AuctionPaymentsService } from './auction-payments.service';
import { ConfirmCardDto } from './dto/confirm-card.dto';

/** Saving a card on file. Card data goes straight from the browser to Stripe; this API never sees it. */
@Controller('auctions/public/bidder/card')
@UseGuards(BidderGuard)
export class AuctionCardController {
  constructor(private readonly payments: AuctionPaymentsService) {}

  @Post('setup-intent')
  @HttpCode(200)
  createSetupIntent(@CurrentBidder() bidder: BidderContext) {
    return this.payments.createSetupIntent(bidder);
  }

  @Post('confirm')
  @HttpCode(200)
  confirm(
    @CurrentBidder() bidder: BidderContext,
    @Body() body: ConfirmCardDto,
  ) {
    if (typeof body?.setupIntentId !== 'string') {
      throw new BadRequestException('setupIntentId is required.');
    }
    return this.payments.confirmCard(bidder, body.setupIntentId);
  }
}
