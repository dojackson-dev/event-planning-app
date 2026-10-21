import { Injectable } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { BidderAuthService } from './bidder-auth.service';

export const DONOR_TOKEN_TTL_SECONDS = 30 * 60;

export interface DonorTokenPayload {
  purpose: 'donor';
  auction_id: string;
  /** HMAC of the verified phone; the number itself is never placed in the token. */
  phone_hash: string;
  /** Unix seconds. */
  exp: number;
}

type RequestHeaders = Record<string, string | string[] | undefined>;

/** Candidate tokens in order: `x-auction-token`, then `Authorization: Bearer <token>` (or the bare token). */
export function readDonorTokens(request: {
  headers?: RequestHeaders;
}): string[] {
  const out: string[] = [];
  const custom = request.headers?.['x-auction-token'];
  if (typeof custom === 'string' && custom) out.push(custom.trim());
  const auth = request.headers?.authorization;
  if (typeof auth === 'string' && auth) {
    out.push(auth.replace(/^Bearer\s+/i, '').trim());
  }
  return out;
}

/** Short-lived proof that a phone number received an SMS code for one auction. Signed like bidder tokens, with its own key. */
@Injectable()
export class DonorAuthService {
  constructor(private readonly auth: BidderAuthService) {}

  phoneHash(auctionId: string, phone: string): string {
    return this.auth.hmacHex('donor', `phone|${auctionId}|${phone}`);
  }

  signToken(
    auctionId: string,
    phone: string,
    nowMs = Date.now(),
  ): { token: string; expiresInSeconds: number } {
    const payload: DonorTokenPayload = {
      purpose: 'donor',
      auction_id: auctionId,
      phone_hash: this.phoneHash(auctionId, phone),
      exp: Math.floor(nowMs / 1000) + DONOR_TOKEN_TTL_SECONDS,
    };
    return {
      token: this.auth.signPayload('donor', payload),
      expiresInSeconds: DONOR_TOKEN_TTL_SECONDS,
    };
  }

  /** Signature, purpose, auction and expiry. */
  verifyToken(
    token: string | undefined,
    auctionId: string,
    nowMs = Date.now(),
  ): DonorTokenPayload | null {
    const payload = this.auth.openPayload(
      'donor',
      token,
    ) as Partial<DonorTokenPayload> | null;
    if (
      !payload ||
      payload.purpose !== 'donor' ||
      payload.auction_id !== auctionId ||
      typeof payload.phone_hash !== 'string' ||
      typeof payload.exp !== 'number' ||
      payload.exp * 1000 <= nowMs
    ) {
      return null;
    }
    return payload as DonorTokenPayload;
  }

  /** First valid token among the request's candidates, or null. */
  fromRequest(
    request: { headers?: RequestHeaders },
    auctionId: string,
  ): DonorTokenPayload | null {
    for (const candidate of readDonorTokens(request)) {
      const payload = this.verifyToken(candidate, auctionId);
      if (payload) return payload;
    }
    return null;
  }

  /** Constant-time check that `phone` is the number the token was issued for. */
  isTokenPhone(
    payload: DonorTokenPayload,
    auctionId: string,
    phone: string,
  ): boolean {
    const expected = Buffer.from(this.phoneHash(auctionId, phone), 'hex');
    const given = Buffer.from(payload.phone_hash, 'hex');
    return expected.length === given.length && timingSafeEqual(expected, given);
  }
}
