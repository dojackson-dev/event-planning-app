import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { AuctionPaymentsService } from './auction-payments.service';

/** Public pay-link routes: the unguessable token is the credential. */
@Controller('auctions/public/pay')
export class AuctionPayController {
  constructor(private readonly payments: AuctionPaymentsService) {}

  @Get(':token')
  summary(@Param('token') token: string) {
    return this.payments.getPaySummary(token);
  }

  @Post(':token/checkout-session')
  @HttpCode(200)
  checkoutSession(@Param('token') token: string) {
    return this.payments.createPayCheckout(token);
  }
}
