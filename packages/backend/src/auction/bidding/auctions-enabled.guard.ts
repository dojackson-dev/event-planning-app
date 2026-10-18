import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

export function auctionsEnabled(): boolean {
  return process.env.AUCTIONS_ENABLED === 'true';
}

/** Pilot switch: every public auction route answers 404 unless AUCTIONS_ENABLED=true. */
@Injectable()
export class AuctionsEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!auctionsEnabled()) throw new NotFoundException();
    return true;
  }
}
