import { BadRequestException } from '@nestjs/common';
import { AUCTION_BID_MODES } from '../../auction.types';
import type { AuctionBidMode } from '../../auction.types';
import { AUCTION_MAX_BID_CENTS } from '../../auction-money';
import { asBody, intField } from './common';

export interface PlaceBidDto {
  amountCents: number;
  mode: AuctionBidMode;
  confirmLargeBid: boolean;
}

export function parsePlaceBid(raw: unknown): PlaceBidDto {
  const body = asBody(raw);
  const mode = body.mode === undefined ? 'manual' : body.mode;
  if (
    typeof mode !== 'string' ||
    !(AUCTION_BID_MODES as readonly string[]).includes(mode)
  ) {
    throw new BadRequestException("mode must be 'manual' or 'max'.");
  }
  if (
    body.confirmLargeBid !== undefined &&
    typeof body.confirmLargeBid !== 'boolean'
  ) {
    throw new BadRequestException('confirmLargeBid must be true or false.');
  }
  return {
    amountCents: intField(
      body.amountCents,
      'amountCents',
      1,
      AUCTION_MAX_BID_CENTS,
    ),
    mode: mode as AuctionBidMode,
    confirmLargeBid: body.confirmLargeBid === true,
  };
}

export function parsePurchase(raw: unknown): { quantity: number } {
  const body = raw === undefined || raw === null ? {} : asBody(raw);
  return {
    quantity:
      body.quantity === undefined
        ? 1
        : intField(body.quantity, 'quantity', 1, 100),
  };
}
