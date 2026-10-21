import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { auctionsEnabled } from './auctions-enabled.guard';
import { BidderAuthService } from './bidder-auth.service';

export const BIDDER_TOKEN_HEADER = 'x-auction-token';

/** Set on the request by BidderGuard once the bidder token is verified. */
export interface BidderContext {
  bidderId: string;
  auctionId: string;
}

export const CurrentBidder = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): BidderContext =>
    ctx.switchToHttp().getRequest<{ auctionBidder: BidderContext }>()
      .auctionBidder,
);

export function readBidderToken(request: {
  headers?: Record<string, string | string[] | undefined>;
}): string | undefined {
  const value = request.headers?.[BIDDER_TOKEN_HEADER];
  return typeof value === 'string' ? value : undefined;
}

@Injectable()
export class BidderGuard implements CanActivate {
  constructor(private readonly auth: BidderAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!auctionsEnabled()) throw new NotFoundException();
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      auctionBidder?: BidderContext;
    }>();
    // The bidder row is re-read on every request so blocks and re-issued tokens apply at once.
    request.auctionBidder = await this.auth.authenticate(
      readBidderToken(request),
    );
    return true;
  }
}
