import {
  HttpException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { AuctionOtpDelivery } from './auction-otp-delivery.service';
import { AuctionPublicService } from './auction-public.service';
import { BidderAuthService } from './bidder-auth.service';
import { BidderOtpService, OTP_MAX_PER_IP_HOUR } from './bidder-otp.service';
import { BidderRegistrationService } from './bidder-registration.service';
import { parseRegisterStart } from './dto/register.dto';
import {
  AUCTION_ID,
  liveAuctionRow,
  makeBiddingDb,
} from './fake-supabase.testutil';
import type { Row } from './fake-supabase.testutil';

const IP = '203.0.113.7';
const input = (overrides: Record<string, unknown> = {}) =>
  parseRegisterStart({
    fullName: 'Pat Donor',
    email: 'Pat@Example.com',
    phone: '(415) 555-0123',
    acceptTerms: true,
    smsConsent: true,
    ...overrides,
  });

describe('BidderRegistrationService', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.AUCTION_SESSION_SECRET = 'r'.repeat(40);
  });
  afterEach(() => {
    process.env = { ...env };
  });

  function setup(tables: Record<string, Row[]> = {}) {
    const db = makeBiddingDb(tables);
    const sent: Array<{ channel: string; destination: string; code: string }> =
      [];
    const delivery = {
      send: jest.fn((channel: string, destination: string, code: string) => {
        sent.push({ channel, destination, code });
        return Promise.resolve(true);
      }),
    } as unknown as AuctionOtpDelivery;
    const auth = new BidderAuthService(db.asService());
    const otp = new BidderOtpService(db.asService(), auth, delivery);
    const publicAuctions = new AuctionPublicService(db.asService());
    const reg = new BidderRegistrationService(
      db.asService(),
      auth,
      otp,
      publicAuctions,
    );
    const age = (ms = 61_000) => {
      for (const row of db.table('auction_otps')) {
        row.created_at = new Date(
          new Date(row.created_at).getTime() - ms,
        ).toISOString();
      }
    };
    const codeFor = (channel: 'email' | 'sms') =>
      [...sent].reverse().find((s) => s.channel === channel)!.code;
    return { db, reg, auth, otp, sent, delivery, age, codeFor };
  }

  const verified = (extra: Row = {}): Row => ({
    id: 'bidder-1',
    auction_id: AUCTION_ID,
    display_name: 'Original Name',
    email: 'pat@example.com',
    phone_e164: '+14155550123',
    paddle_number: 5,
    email_verified_at: '2026-01-01T00:00:00.000Z',
    phone_verified_at: '2026-01-01T00:00:00.000Z',
    token_version: 0,
    blocked_at: null,
    ...extra,
  });

  async function fullyRegister(ctx: ReturnType<typeof setup>) {
    await ctx.reg.start(AUCTION_ID, input(), IP);
    await ctx.reg.verify(AUCTION_ID, {
      email: 'pat@example.com',
      channel: 'email',
      code: ctx.codeFor('email'),
    });
    return ctx.reg.verify(AUCTION_ID, {
      email: 'pat@example.com',
      channel: 'sms',
      code: ctx.codeFor('sms'),
    });
  }

  describe('start', () => {
    it('creates an unverified bidder with paddle, consent record and hashed IP', async () => {
      const { db, reg, auth, sent } = setup();
      const result = await reg.start(AUCTION_ID, input(), IP);

      expect(result).toMatchObject({
        ok: true,
        sent: { email: true, sms: true },
      });
      expect(JSON.stringify(result)).not.toContain('bidder-');
      const [row] = db.table('auction_bidders');
      expect(row).toMatchObject({
        auction_id: AUCTION_ID,
        display_name: 'Pat Donor',
        email: 'pat@example.com',
        phone_e164: '+14155550123',
        paddle_number: 1,
        auth_terms_version: 'v1',
        sms_consent: true,
        email_verified_at: null,
        phone_verified_at: null,
      });
      expect(row.auth_accepted_at).toEqual(expect.any(String));
      expect(row.auth_ip_hash).toBe(auth.hashIp(IP));
      expect(JSON.stringify(row)).not.toContain(IP);
      expect(sent.map((s) => s.channel).sort()).toEqual(['email', 'sms']);
    });

    it('stores only hashed codes', async () => {
      const { db, reg, sent } = setup();
      await reg.start(AUCTION_ID, input(), IP);
      const rows = db.table('auction_otps');
      expect(rows).toHaveLength(2);
      for (const { code } of sent) {
        expect(JSON.stringify(rows)).not.toContain(`"${code}"`);
      }
      expect(rows.every((r) => /^[0-9a-f]{64}$/.test(r.code_hash))).toBe(true);
    });

    it('assigns increasing paddle numbers', async () => {
      const { db, reg } = setup();
      await reg.start(AUCTION_ID, input(), IP);
      await reg.start(
        AUCTION_ID,
        input({ email: 'sam@example.com', phone: '4155550188' }),
        IP,
      );
      expect(db.table('auction_bidders').map((b) => b.paddle_number)).toEqual([
        1, 2,
      ]);
    });

    it('retries when a concurrent registration takes the paddle number', async () => {
      const { db, reg } = setup();
      db.beforeInsert.auction_bidders = [
        () =>
          db.table('auction_bidders').push({
            id: 'racer',
            auction_id: AUCTION_ID,
            email: 'racer@example.com',
            phone_e164: '+14155550999',
            paddle_number: 1,
          }),
      ];
      await reg.start(AUCTION_ID, input(), IP);
      const mine = db
        .table('auction_bidders')
        .find((b) => b.email === 'pat@example.com');
      expect(mine?.paddle_number).toBe(2);
    });

    it('reuses a bidder when email and phone both match', async () => {
      const ctx = setup();
      await ctx.reg.start(AUCTION_ID, input(), IP);
      ctx.age();
      await ctx.reg.start(AUCTION_ID, input({ fullName: 'Pat D.' }), IP);
      expect(ctx.db.table('auction_bidders')).toHaveLength(1);
      expect(ctx.db.table('auction_bidders')[0].display_name).toBe('Pat D.');
      expect(ctx.sent).toHaveLength(4);
    });

    it('does not let an unauthenticated call rewrite a verified bidder', async () => {
      const ctx = setup({ auction_bidders: [verified()] });
      await ctx.reg.start(
        AUCTION_ID,
        input({ fullName: 'Attacker', smsConsent: false }),
        IP,
      );
      const row = ctx.db.table('auction_bidders')[0];
      expect(row.display_name).toBe('Original Name');
      expect(row.sms_consent).toBeUndefined();
    });

    it('rejects partial matches with one identical generic message', async () => {
      const ctx = setup({ auction_bidders: [verified()] });
      const emailOnly = await ctx.reg
        .start(AUCTION_ID, input({ phone: '4155550100' }), IP)
        .catch((e: HttpException) => e);
      const phoneOnly = await ctx.reg
        .start(AUCTION_ID, input({ email: 'other@example.com' }), IP)
        .catch((e: HttpException) => e);
      for (const err of [emailOnly, phoneOnly]) {
        expect(err).toBeInstanceOf(HttpException);
        expect((err as HttpException).getStatus()).toBe(409);
      }
      const bodyA = (emailOnly as HttpException).getResponse() as Row;
      const bodyB = (phoneOnly as HttpException).getResponse() as Row;
      expect(bodyA).toEqual(bodyB);
      expect(JSON.stringify(bodyA).toLowerCase()).not.toMatch(
        /email|phone|already|exists|taken/,
      );
      expect(ctx.sent).toHaveLength(0);
    });

    it('rejects a blocked bidder re-registering', async () => {
      const ctx = setup({
        auction_bidders: [verified({ blocked_at: '2026-02-01T00:00:00.000Z' })],
      });
      await expect(
        ctx.reg.start(AUCTION_ID, input(), IP),
      ).rejects.toMatchObject({ status: 409 });
      expect(ctx.sent).toHaveLength(0);
    });

    it('404s for auctions that are closed, unlisted or not a verified non-profit', async () => {
      const closed = setup({
        auctions: [liveAuctionRow({ status: 'closed' })],
      });
      await expect(
        closed.reg.start(AUCTION_ID, input(), IP),
      ).rejects.toBeInstanceOf(NotFoundException);

      const pending = setup({
        auctions: [
          liveAuctionRow({
            promoter_accounts: {
              is_nonprofit: true,
              nonprofit_status: 'pending',
            },
          }),
        ],
      });
      await expect(
        pending.reg.start(AUCTION_ID, input(), IP),
      ).rejects.toBeInstanceOf(NotFoundException);

      const ended = setup({
        auctions: [
          liveAuctionRow({
            ends_at: new Date(Date.now() - 1000).toISOString(),
          }),
        ],
      });
      await expect(
        ended.reg.start(AUCTION_ID, input(), IP),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers 429 when the IP hash hit its hourly quota', async () => {
      const ctx = setup();
      for (let i = 0; i < OTP_MAX_PER_IP_HOUR; i++) {
        ctx.db.table('auction_otps').push({
          id: `o${i}`,
          bidder_id: 'x',
          channel: 'email',
          destination: `d${i}@example.com`,
          created_at: new Date().toISOString(),
          ip_hash: ctx.auth.hashIp(IP),
        });
      }
      await expect(
        ctx.reg.start(AUCTION_ID, input(), IP),
      ).rejects.toMatchObject({ status: 429 });
      expect(ctx.db.table('auction_bidders')).toHaveLength(0);
      // A different IP is unaffected.
      await expect(
        ctx.reg.start(AUCTION_ID, input(), '198.51.100.2'),
      ).resolves.toMatchObject({ ok: true });
    });

    it('answers 429 when codes were just sent for both channels', async () => {
      const ctx = setup();
      await ctx.reg.start(AUCTION_ID, input(), IP);
      await expect(
        ctx.reg.start(AUCTION_ID, input(), IP),
      ).rejects.toMatchObject({ status: 429 });
    });

    it('still succeeds when delivery fails and never throws', async () => {
      const ctx = setup();
      (ctx.delivery.send as jest.Mock).mockResolvedValue(false);
      await expect(
        ctx.reg.start(AUCTION_ID, input(), IP),
      ).resolves.toMatchObject({ ok: true });
    });
  });

  describe('verify', () => {
    it('needs both channels before issuing a token', async () => {
      const ctx = setup();
      await ctx.reg.start(AUCTION_ID, input(), IP);

      const first = await ctx.reg.verify(AUCTION_ID, {
        email: 'pat@example.com',
        channel: 'email',
        code: ctx.codeFor('email'),
      });
      expect(first).toEqual({ verified: { email: true, phone: false } });
      expect(
        ctx.db.table('auction_bidders')[0].email_verified_at,
      ).not.toBeNull();
      expect(ctx.db.table('auction_bidders')[0].phone_verified_at).toBeNull();

      const second = await ctx.reg.verify(AUCTION_ID, {
        email: 'pat@example.com',
        channel: 'sms',
        code: ctx.codeFor('sms'),
      });
      expect(second).toMatchObject({
        verified: { email: true, phone: true },
        token: expect.any(String),
        token_expires_at: expect.any(String),
      });
      await expect(
        ctx.auth.authenticate((second as { token: string }).token),
      ).resolves.toMatchObject({ auctionId: AUCTION_ID });
    });

    it('rejects wrong codes and unknown emails with the same 401', async () => {
      const ctx = setup();
      await ctx.reg.start(AUCTION_ID, input(), IP);
      const wrong = ctx.codeFor('email') === '000000' ? '000001' : '000000';
      const a = await ctx.reg
        .verify(AUCTION_ID, {
          email: 'pat@example.com',
          channel: 'email',
          code: wrong,
        })
        .catch((e: UnauthorizedException) => e);
      const b = await ctx.reg
        .verify(AUCTION_ID, {
          email: 'nobody@example.com',
          channel: 'email',
          code: '123456',
        })
        .catch((e: UnauthorizedException) => e);
      expect(a).toBeInstanceOf(UnauthorizedException);
      expect(b).toBeInstanceOf(UnauthorizedException);
      expect((a as UnauthorizedException).getResponse()).toEqual(
        (b as UnauthorizedException).getResponse(),
      );
    });

    it('locks a code after 5 wrong attempts', async () => {
      const ctx = setup();
      await ctx.reg.start(AUCTION_ID, input(), IP);
      const real = ctx.codeFor('email');
      const wrong = real === '000000' ? '000001' : '000000';
      for (let i = 0; i < 5; i++) {
        await expect(
          ctx.reg.verify(AUCTION_ID, {
            email: 'pat@example.com',
            channel: 'email',
            code: wrong,
          }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
      }
      await expect(
        ctx.reg.verify(AUCTION_ID, {
          email: 'pat@example.com',
          channel: 'email',
          code: real,
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('does not hand a token to someone who proves only one channel of a verified bidder', async () => {
      const ctx = setup({ auction_bidders: [verified()] });
      await ctx.reg.start(AUCTION_ID, input(), IP);
      const partial = await ctx.reg.verify(AUCTION_ID, {
        email: 'pat@example.com',
        channel: 'email',
        code: ctx.codeFor('email'),
      });
      expect(partial).not.toHaveProperty('token');

      const complete = await ctx.reg.verify(AUCTION_ID, {
        email: 'pat@example.com',
        channel: 'sms',
        code: ctx.codeFor('sms'),
      });
      expect(complete).toHaveProperty('token');
    });

    it('rejects verify when no code was requested', async () => {
      const ctx = setup({ auction_bidders: [verified()] });
      await expect(
        ctx.reg.verify(AUCTION_ID, {
          email: 'pat@example.com',
          channel: 'email',
          code: '123456',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a blocked bidder', async () => {
      const ctx = setup();
      await ctx.reg.start(AUCTION_ID, input(), IP);
      ctx.db.table('auction_bidders')[0].blocked_at = new Date().toISOString();
      await expect(
        ctx.reg.verify(AUCTION_ID, {
          email: 'pat@example.com',
          channel: 'email',
          code: ctx.codeFor('email'),
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('resend', () => {
    it('answers identically for known and unknown emails', async () => {
      const ctx = setup({ auction_bidders: [verified()] });
      const known = await ctx.reg.resend(
        AUCTION_ID,
        { email: 'pat@example.com', channel: 'email' },
        IP,
      );
      const unknown = await ctx.reg.resend(
        AUCTION_ID,
        { email: 'nobody@example.com', channel: 'email' },
        IP,
      );
      expect(known).toEqual(unknown);
      expect(ctx.sent).toHaveLength(1);
      expect(ctx.sent[0].destination).toBe('pat@example.com');
    });

    it('hides the cooldown from the caller', async () => {
      const ctx = setup({ auction_bidders: [verified()] });
      const dto = { email: 'pat@example.com', channel: 'sms' as const };
      const first = await ctx.reg.resend(AUCTION_ID, dto, IP);
      const second = await ctx.reg.resend(AUCTION_ID, dto, IP);
      expect(second).toEqual(first);
      expect(ctx.sent).toHaveLength(1);
    });

    it('answers 429 when the IP quota is used up', async () => {
      const ctx = setup();
      for (let i = 0; i < OTP_MAX_PER_IP_HOUR; i++) {
        ctx.db.table('auction_otps').push({
          id: `o${i}`,
          bidder_id: 'x',
          channel: 'email',
          destination: `d${i}@example.com`,
          created_at: new Date().toISOString(),
          ip_hash: ctx.auth.hashIp(IP),
        });
      }
      await expect(
        ctx.reg.resend(
          AUCTION_ID,
          { email: 'pat@example.com', channel: 'email' },
          IP,
        ),
      ).rejects.toMatchObject({ status: 429 });
    });
  });

  describe('login', () => {
    it('sends an email code only to fully verified bidders, with an identical response', async () => {
      const ctx = setup({
        auction_bidders: [
          verified(),
          verified({
            id: 'bidder-2',
            email: 'half@example.com',
            phone_e164: '+14155550177',
            paddle_number: 6,
            phone_verified_at: null,
          }),
        ],
      });
      const known = await ctx.reg.loginStart(AUCTION_ID, 'pat@example.com', IP);
      const half = await ctx.reg.loginStart(AUCTION_ID, 'half@example.com', IP);
      const unknown = await ctx.reg.loginStart(
        AUCTION_ID,
        'nobody@example.com',
        IP,
      );
      expect(known).toEqual(half);
      expect(known).toEqual(unknown);
      expect(ctx.sent).toHaveLength(1);
      expect(ctx.sent[0]).toMatchObject({
        channel: 'email',
        destination: 'pat@example.com',
      });
    });

    it('issues a fresh token and revokes the old one', async () => {
      const ctx = setup();
      const registered = (await fullyRegister(ctx)) as { token: string };
      expect(registered.token).toBeDefined();

      ctx.age();
      await ctx.reg.loginStart(AUCTION_ID, 'pat@example.com', IP);
      const login = await ctx.reg.loginVerify(
        AUCTION_ID,
        'pat@example.com',
        ctx.codeFor('email'),
      );
      await expect(ctx.auth.authenticate(login.token)).resolves.toBeDefined();
      await expect(
        ctx.auth.authenticate(registered.token),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong login code and consumes a code only once', async () => {
      const ctx = setup({ auction_bidders: [verified()] });
      await ctx.reg.loginStart(AUCTION_ID, 'pat@example.com', IP);
      const code = ctx.codeFor('email');
      const wrong = code === '000000' ? '000001' : '000000';
      await expect(
        ctx.reg.loginVerify(AUCTION_ID, 'pat@example.com', wrong),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await ctx.reg.loginVerify(AUCTION_ID, 'pat@example.com', code);
      await expect(
        ctx.reg.loginVerify(AUCTION_ID, 'pat@example.com', code),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('does not log in a bidder who has not finished verification', async () => {
      const ctx = setup({
        auction_bidders: [verified({ phone_verified_at: null })],
      });
      await ctx.reg.loginStart(AUCTION_ID, 'pat@example.com', IP);
      expect(ctx.sent).toHaveLength(0);
      await expect(
        ctx.reg.loginVerify(AUCTION_ID, 'pat@example.com', '123456'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
