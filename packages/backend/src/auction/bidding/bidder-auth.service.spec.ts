import {
  ExecutionContext,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  BidderAuthService,
  BIDDER_TOKEN_TTL_SECONDS,
} from './bidder-auth.service';
import { BidderGuard } from './bidder.guard';
import { AUCTION_ID, makeBiddingDb } from './fake-supabase.testutil';

const SECRET_A = 'a'.repeat(40);
const SECRET_B = 'b'.repeat(40);
const BIDDER_ID = '22222222-2222-4222-8222-222222222222';

describe('BidderAuthService', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
    jest.restoreAllMocks();
  });

  function setup(secret: string | null = SECRET_A, rows = [bidder()]) {
    if (secret === null) delete process.env.AUCTION_SESSION_SECRET;
    else process.env.AUCTION_SESSION_SECRET = secret;
    const db = makeBiddingDb({ auction_bidders: rows });
    return { db, auth: new BidderAuthService(db.asService()) };
  }

  function bidder(overrides: Record<string, unknown> = {}) {
    return {
      id: BIDDER_ID,
      auction_id: AUCTION_ID,
      token_version: 0,
      blocked_at: null,
      ...overrides,
    };
  }

  describe('secret handling', () => {
    it('throws at startup in production when auctions are enabled and the secret is missing', () => {
      process.env.NODE_ENV = 'production';
      process.env.AUCTIONS_ENABLED = 'true';
      expect(() => setup(null)).toThrow(/AUCTION_SESSION_SECRET/);
    });

    it('throws at startup in production when auctions are enabled and the secret is shorter than 32 chars', () => {
      process.env.NODE_ENV = 'production';
      process.env.AUCTIONS_ENABLED = 'true';
      expect(() => setup('short-secret')).toThrow(/AUCTION_SESSION_SECRET/);
    });

    it('does not block startup in production while auctions are disabled', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.AUCTIONS_ENABLED;
      expect(() => setup(null)).not.toThrow();
    });

    it('starts in production with a long secret', () => {
      process.env.NODE_ENV = 'production';
      process.env.AUCTIONS_ENABLED = 'true';
      expect(() => setup(SECRET_A)).not.toThrow();
    });

    it('uses a random per-process secret outside production and warns', () => {
      process.env.NODE_ENV = 'development';
      const first = setup(null).auth;
      const second = setup(null).auth;
      const { token } = first.signToken(BIDDER_ID, AUCTION_ID, 0);
      expect(first.verifyToken(token)).not.toBeNull();
      expect(second.verifyToken(token)).toBeNull();
    });
  });

  describe('token signing', () => {
    it('round-trips the payload', () => {
      const { auth } = setup();
      const now = Date.now();
      const { token, expiresAt } = auth.signToken(
        BIDDER_ID,
        AUCTION_ID,
        3,
        now,
      );
      expect(auth.verifyToken(token, now)).toEqual({
        bidder_id: BIDDER_ID,
        auction_id: AUCTION_ID,
        token_version: 3,
        exp: Math.floor(now / 1000) + BIDDER_TOKEN_TTL_SECONDS,
      });
      expect(expiresAt.getTime()).toBe(
        (Math.floor(now / 1000) + BIDDER_TOKEN_TTL_SECONDS) * 1000,
      );
    });

    it('rejects a tampered payload', () => {
      const { auth } = setup();
      const { token } = auth.signToken(BIDDER_ID, AUCTION_ID, 0);
      const [body, sig] = token.split('.');
      const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
      payload.bidder_id = '33333333-3333-4333-8333-333333333333';
      const forged = `${Buffer.from(JSON.stringify(payload)).toString('base64url')}.${sig}`;
      expect(auth.verifyToken(forged)).toBeNull();
    });

    it('rejects a tampered signature and malformed tokens', () => {
      const { auth } = setup();
      const { token } = auth.signToken(BIDDER_ID, AUCTION_ID, 0);
      const [body] = token.split('.');
      expect(auth.verifyToken(`${body}.AAAA`)).toBeNull();
      expect(auth.verifyToken(`${body}.`)).toBeNull();
      expect(auth.verifyToken(body)).toBeNull();
      expect(auth.verifyToken('')).toBeNull();
      expect(auth.verifyToken(undefined)).toBeNull();
      expect(auth.verifyToken('a.b.c')).toBeNull();
    });

    it('rejects a token signed with another secret', () => {
      const a = setup(SECRET_A).auth;
      const b = setup(SECRET_B).auth;
      expect(
        b.verifyToken(a.signToken(BIDDER_ID, AUCTION_ID, 0).token),
      ).toBeNull();
    });

    it('rejects an expired token', () => {
      const { auth } = setup();
      const now = Date.now();
      const { token } = auth.signToken(BIDDER_ID, AUCTION_ID, 0, now);
      const later = now + (BIDDER_TOKEN_TTL_SECONDS + 1) * 1000;
      expect(auth.verifyToken(token, later)).toBeNull();
    });

    it('derives separate keys per purpose', () => {
      const { auth } = setup();
      expect(auth.hmacHex('otp', 'x')).not.toBe(auth.hmacHex('ip', 'x'));
      expect(auth.hmacHex('otp', 'x')).not.toBe(auth.hmacHex('token', 'x'));
    });

    it('hashes IPs instead of storing them', () => {
      const { auth } = setup();
      const hash = auth.hashIp('203.0.113.9');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).not.toContain('203');
    });
  });

  describe('revocation', () => {
    it('authenticates a current token', async () => {
      const { auth } = setup();
      const { token } = await auth.issueToken(BIDDER_ID, AUCTION_ID);
      await expect(auth.authenticate(token)).resolves.toEqual({
        bidderId: BIDDER_ID,
        auctionId: AUCTION_ID,
      });
    });

    it('revokes older tokens when a new one is issued', async () => {
      const { auth, db } = setup();
      const first = await auth.issueToken(BIDDER_ID, AUCTION_ID);
      const second = await auth.issueToken(BIDDER_ID, AUCTION_ID);
      expect(db.table('auction_bidders')[0].token_version).toBe(2);
      await expect(auth.authenticate(first.token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(auth.authenticate(second.token)).resolves.toMatchObject({
        bidderId: BIDDER_ID,
      });
    });

    it('rejects a blocked bidder immediately', async () => {
      const { auth, db } = setup();
      const { token } = await auth.issueToken(BIDDER_ID, AUCTION_ID);
      db.table('auction_bidders')[0].blocked_at = new Date().toISOString();
      await expect(auth.authenticate(token)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a token for a bidder that no longer exists', async () => {
      const { auth, db } = setup();
      const { token } = await auth.issueToken(BIDDER_ID, AUCTION_ID);
      db.tables.auction_bidders = [];
      await expect(auth.tryAuthenticate(token)).resolves.toBeNull();
    });

    it('refuses to issue a token for a blocked bidder', async () => {
      const { auth } = setup(SECRET_A, [
        bidder({ blocked_at: new Date().toISOString() }),
      ]);
      await expect(
        auth.issueToken(BIDDER_ID, AUCTION_ID),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('BidderGuard', () => {
    function context(headers: Record<string, string> = {}) {
      const request: Record<string, unknown> = { headers };
      return {
        request,
        ctx: {
          switchToHttp: () => ({ getRequest: () => request }),
        } as unknown as ExecutionContext,
      };
    }

    beforeEach(() => {
      process.env.AUCTIONS_ENABLED = 'true';
    });

    it('sets request.auctionBidder for a valid token', async () => {
      const { auth } = setup();
      const { token } = await auth.issueToken(BIDDER_ID, AUCTION_ID);
      const { ctx, request } = context({ 'x-auction-token': token });
      await expect(new BidderGuard(auth).canActivate(ctx)).resolves.toBe(true);
      expect(request.auctionBidder).toEqual({
        bidderId: BIDDER_ID,
        auctionId: AUCTION_ID,
      });
    });

    it('rejects a missing or invalid token with 401', async () => {
      const { auth } = setup();
      const guard = new BidderGuard(auth);
      await expect(guard.canActivate(context().ctx)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(
        guard.canActivate(context({ 'x-auction-token': 'nope' }).ctx),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('answers 404 when the feature flag is off', async () => {
      process.env.AUCTIONS_ENABLED = 'false';
      const { auth } = setup();
      await expect(
        new BidderGuard(auth).canActivate(context().ctx),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
