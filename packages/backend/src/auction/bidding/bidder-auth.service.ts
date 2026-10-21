import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { SupabaseService } from '../../supabase/supabase.service';
import type { BidderContext } from './bidder.guard';

export const MIN_AUCTION_SECRET_LENGTH = 32;
export const BIDDER_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface BidderTokenPayload {
  bidder_id: string;
  auction_id: string;
  token_version: number;
  /** Unix seconds. */
  exp: number;
}

export type KeyPurpose = 'token' | 'otp' | 'ip' | 'donor';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

@Injectable()
export class BidderAuthService {
  private readonly logger = new Logger(BidderAuthService.name);
  private readonly secret: string;
  private readonly keys = new Map<KeyPurpose, Buffer>();

  constructor(private readonly supabase: SupabaseService) {
    const configured = process.env.AUCTION_SESSION_SECRET;
    if (configured && configured.length >= MIN_AUCTION_SECRET_LENGTH) {
      this.secret = configured;
    } else if (
      process.env.NODE_ENV === 'production' &&
      process.env.AUCTIONS_ENABLED === 'true'
    ) {
      // Only enforced once auctions are switched on, so deploying the code never blocks startup.
      throw new Error(
        `AUCTION_SESSION_SECRET must be set to at least ${MIN_AUCTION_SECRET_LENGTH} characters in production`,
      );
    } else {
      this.secret = randomBytes(32).toString('hex');
      this.logger.warn(
        'AUCTION_SESSION_SECRET is missing or too short: using a random per-process secret (bidder tokens reset on restart).',
      );
    }
  }

  /** Separate keys per purpose so a token signature can never double as an OTP or IP hash. */
  private key(purpose: KeyPurpose): Buffer {
    let key = this.keys.get(purpose);
    if (!key) {
      key = createHmac('sha256', this.secret)
        .update(`eventecos-auction-${purpose}-v1`)
        .digest();
      this.keys.set(purpose, key);
    }
    return key;
  }

  hmacHex(purpose: KeyPurpose, data: string): string {
    return createHmac('sha256', this.key(purpose)).update(data).digest('hex');
  }

  hashIp(ip: string): string {
    return this.hmacHex('ip', ip);
  }

  /** `<base64url json>.<base64url HMAC>` under the purpose's key. */
  signPayload(purpose: KeyPurpose, payload: object): string {
    const body = b64url(JSON.stringify(payload));
    const sig = createHmac('sha256', this.key(purpose)).update(body).digest();
    return `${body}.${b64url(sig)}`;
  }

  /** Constant-time signature check; returns the decoded JSON object or null. Expiry is the caller's check. */
  openPayload(
    purpose: KeyPurpose,
    token: string | undefined,
  ): Record<string, unknown> | null {
    if (!token || token.length > 1024) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    const expected = createHmac('sha256', this.key(purpose))
      .update(body)
      .digest();
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
      return null;
    }
    try {
      const payload: unknown = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      );
      return payload !== null &&
        typeof payload === 'object' &&
        !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  signToken(
    bidderId: string,
    auctionId: string,
    tokenVersion: number,
    nowMs = Date.now(),
  ): { token: string; expiresAt: Date } {
    const exp = Math.floor(nowMs / 1000) + BIDDER_TOKEN_TTL_SECONDS;
    const payload: BidderTokenPayload = {
      bidder_id: bidderId,
      auction_id: auctionId,
      token_version: tokenVersion,
      exp,
    };
    return {
      token: this.signPayload('token', payload),
      expiresAt: new Date(exp * 1000),
    };
  }

  /** Signature + expiry only; revocation is checked against the database in authenticate(). */
  verifyToken(
    token: string | undefined,
    nowMs = Date.now(),
  ): BidderTokenPayload | null {
    const payload = this.openPayload(
      'token',
      token,
    ) as Partial<BidderTokenPayload> | null;
    if (
      !payload ||
      typeof payload.bidder_id !== 'string' ||
      typeof payload.auction_id !== 'string' ||
      !Number.isInteger(payload.token_version) ||
      typeof payload.exp !== 'number' ||
      payload.exp * 1000 <= nowMs
    ) {
      return null;
    }
    return payload as BidderTokenPayload;
  }

  /** Valid signature, unexpired, bidder not blocked and token_version still current. */
  async tryAuthenticate(
    token: string | undefined,
  ): Promise<BidderContext | null> {
    const payload = this.verifyToken(token);
    if (!payload) return null;
    const { data, error } = await this.supabase
      .getAdminClient()
      .from('auction_bidders')
      .select('id, auction_id, token_version, blocked_at')
      .eq('id', payload.bidder_id)
      .maybeSingle();
    if (error) {
      this.logger.error(`Bidder lookup failed: ${error.message}`);
      throw new ServiceUnavailableException('Please try again shortly.');
    }
    if (
      !data ||
      data.auction_id !== payload.auction_id ||
      data.blocked_at !== null ||
      data.token_version !== payload.token_version
    ) {
      return null;
    }
    return { bidderId: data.id, auctionId: data.auction_id };
  }

  async authenticate(token: string | undefined): Promise<BidderContext> {
    const context = await this.tryAuthenticate(token);
    if (!context) throw new UnauthorizedException('Please verify to bid.');
    return context;
  }

  /** Bumps token_version (revoking earlier tokens) and signs a fresh token. */
  async issueToken(
    bidderId: string,
    auctionId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const db = this.supabase.getAdminClient();
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: row, error } = await db
        .from('auction_bidders')
        .select('token_version, auction_id, blocked_at')
        .eq('id', bidderId)
        .maybeSingle();
      if (error) {
        this.logger.error(`Token version read failed: ${error.message}`);
        throw new ServiceUnavailableException('Please try again shortly.');
      }
      if (!row || row.auction_id !== auctionId || row.blocked_at !== null) {
        throw new UnauthorizedException('Unable to start a session.');
      }
      const next = row.token_version + 1;
      const { data: updated, error: updateError } = await db
        .from('auction_bidders')
        .update({ token_version: next, updated_at: new Date().toISOString() })
        .eq('id', bidderId)
        .eq('token_version', row.token_version)
        .select('id');
      if (updateError) {
        this.logger.error(`Token version bump failed: ${updateError.message}`);
        throw new ServiceUnavailableException('Please try again shortly.');
      }
      if (updated && updated.length > 0) {
        return this.signToken(bidderId, auctionId, next);
      }
    }
    throw new ServiceUnavailableException('Please try again shortly.');
  }
}
