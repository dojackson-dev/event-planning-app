import {
  BidderOtpService,
  OTP_MAX_PER_DESTINATION_DAY,
  OTP_MAX_PER_IP_HOUR,
  OTP_TTL_MS,
} from './bidder-otp.service';
import { BidderAuthService } from './bidder-auth.service';
import type { AuctionOtpDelivery } from './auction-otp-delivery.service';
import { AUCTION_ID, makeBiddingDb } from './fake-supabase.testutil';

const BIDDER_ID = '22222222-2222-4222-8222-222222222222';
const EMAIL = 'pat@example.com';
const PHONE = '+14155550123';

describe('BidderOtpService', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.AUCTION_SESSION_SECRET = 'o'.repeat(40);
    delete process.env.AUCTION_OTP_SMS_HOURLY_CAP;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  function setup() {
    const db = makeBiddingDb({
      auction_bidders: [{ id: BIDDER_ID, auction_id: AUCTION_ID }],
    });
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
    const lastCode = () => sent[sent.length - 1].code;
    /** Move every stored row back in time so cooldowns and windows elapse. */
    const age = (ms: number) => {
      for (const row of db.table('auction_otps')) {
        row.created_at = new Date(
          new Date(row.created_at).getTime() - ms,
        ).toISOString();
      }
    };
    const issue = (
      overrides: Partial<Parameters<BidderOtpService['issue']>[0]> = {},
    ) =>
      otp.issue({
        bidderId: BIDDER_ID,
        channel: 'email',
        destination: EMAIL,
        ipHash: 'ip-1',
        ...overrides,
      });
    const verify = (code: string, channel: 'email' | 'sms' = 'email') =>
      otp.verify({
        bidderId: BIDDER_ID,
        channel,
        destination: channel === 'email' ? EMAIL : PHONE,
        code,
      });
    return { db, otp, sent, lastCode, age, issue, verify, delivery };
  }

  it('generates a 6-digit code and stores only an HMAC hash', async () => {
    const { db, issue, lastCode, otp } = setup();
    await expect(issue()).resolves.toEqual({ sent: true, delivered: true });
    const code = lastCode();
    expect(code).toMatch(/^\d{6}$/);

    const [row] = db.table('auction_otps');
    expect(JSON.stringify(row)).not.toContain(code);
    expect(row.code_hash).toBe(otp.hashCode(BIDDER_ID, 'email', EMAIL, code));
    expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.ip_hash).toBe('ip-1');
    expect(new Date(row.expires_at).getTime() - Date.now()).toBeLessThanOrEqual(
      OTP_TTL_MS,
    );
    expect(new Date(row.expires_at).getTime() - Date.now()).toBeGreaterThan(
      OTP_TTL_MS - 5_000,
    );
  });

  it('binds the hash to bidder, channel and destination', () => {
    const { otp } = setup();
    const base = otp.hashCode(BIDDER_ID, 'email', EMAIL, '123456');
    expect(otp.hashCode(BIDDER_ID, 'sms', EMAIL, '123456')).not.toBe(base);
    expect(otp.hashCode(BIDDER_ID, 'email', 'x@y.co', '123456')).not.toBe(base);
    expect(otp.hashCode('other', 'email', EMAIL, '123456')).not.toBe(base);
  });

  it('verifies the right code and consumes it exactly once', async () => {
    const { issue, lastCode, verify, db, otp } = setup();
    await issue();
    const code = lastCode();
    await expect(verify(code)).resolves.toBe('ok');
    expect(db.table('auction_otps')[0].consumed_at).not.toBeNull();
    await expect(verify(code)).resolves.toBe('invalid');
    await expect(otp.isLatestConsumed(BIDDER_ID, 'email')).resolves.toBe(true);
  });

  it('rejects a wrong code without consuming the real one', async () => {
    const { issue, lastCode, verify } = setup();
    await issue();
    const code = lastCode();
    const wrong = code === '000000' ? '000001' : '000000';
    await expect(verify(wrong)).resolves.toBe('invalid');
    await expect(verify(code)).resolves.toBe('ok');
  });

  it('locks after 5 wrong attempts even if the right code follows', async () => {
    const { issue, lastCode, verify, db } = setup();
    await issue();
    const code = lastCode();
    const wrong = code === '000000' ? '000001' : '000000';
    for (let i = 0; i < 4; i++) {
      await expect(verify(wrong)).resolves.toBe('invalid');
    }
    await expect(verify(wrong)).resolves.toBe('locked');
    await expect(verify(code)).resolves.not.toBe('ok');
    expect(db.table('auction_otps')[0].attempts).toBe(5);
    expect(db.table('auction_otps')[0].consumed_at).toBeNull();
  });

  it('never lets concurrent guesses exceed the attempt limit', async () => {
    const { issue, lastCode, verify, db } = setup();
    await issue();
    const code = lastCode();
    const wrong = code === '000000' ? '000001' : '000000';
    await Promise.all(Array.from({ length: 12 }, () => verify(wrong)));
    expect(db.table('auction_otps')[0].attempts).toBeLessThanOrEqual(5);
  });

  it('rejects an expired code', async () => {
    const { issue, lastCode, verify, db } = setup();
    await issue();
    db.table('auction_otps')[0].expires_at = new Date(
      Date.now() - 1000,
    ).toISOString();
    await expect(verify(lastCode())).resolves.toBe('expired');
  });

  it('reports invalid when nothing was requested', async () => {
    const { verify } = setup();
    await expect(verify('123456')).resolves.toBe('invalid');
  });

  it('enforces the 60 second resend cooldown', async () => {
    const { issue, age, sent } = setup();
    await expect(issue()).resolves.toMatchObject({ sent: true });
    await expect(issue()).resolves.toEqual({
      sent: false,
      limited: 'cooldown',
    });
    expect(sent).toHaveLength(1);
    age(61_000);
    await expect(issue()).resolves.toMatchObject({ sent: true });
    expect(sent).toHaveLength(2);
  });

  it('supersedes the previous code when a new one is sent', async () => {
    const { issue, age, sent, verify } = setup();
    await issue();
    const first = sent[0].code;
    age(61_000);
    await issue();
    const second = sent[1].code;
    if (first !== second) {
      await expect(verify(first)).resolves.toBe('invalid');
    }
    await expect(verify(second)).resolves.toBe('ok');
  });

  it('allows at most 3 sends per destination per 10 minutes', async () => {
    const { issue, age, sent } = setup();
    for (let i = 0; i < 3; i++) {
      await expect(issue()).resolves.toMatchObject({ sent: true });
      age(61_000);
    }
    await expect(issue()).resolves.toEqual({
      sent: false,
      limited: 'destination',
    });
    expect(sent).toHaveLength(3);
    // The window slides: after 10 minutes the destination may request again.
    age(10 * 60_000);
    await expect(issue()).resolves.toMatchObject({ sent: true });
  });

  it('allows at most 10 sends per destination per day', async () => {
    const { issue, age, sent } = setup();
    for (let i = 0; i < OTP_MAX_PER_DESTINATION_DAY; i++) {
      await expect(issue()).resolves.toMatchObject({ sent: true });
      age(11 * 60_000);
    }
    await expect(issue()).resolves.toEqual({
      sent: false,
      limited: 'destination',
    });
    expect(sent).toHaveLength(OTP_MAX_PER_DESTINATION_DAY);
  });

  it('counts 20 sends per IP hash per hour from the database', async () => {
    const { db, otp } = setup();
    await expect(otp.isIpLimited('ip-9')).resolves.toBe(false);
    for (let i = 0; i < OTP_MAX_PER_IP_HOUR; i++) {
      db.table('auction_otps').push({
        id: `otp-${i}`,
        bidder_id: BIDDER_ID,
        channel: 'email',
        destination: `d${i}@example.com`,
        code_hash: 'x',
        attempts: 0,
        consumed_at: null,
        expires_at: new Date(Date.now() + 1000).toISOString(),
        created_at: new Date().toISOString(),
        ip_hash: 'ip-9',
      });
    }
    await expect(otp.isIpLimited('ip-9')).resolves.toBe(true);
    await expect(otp.isIpLimited('ip-other')).resolves.toBe(false);
    for (const row of db.table('auction_otps')) {
      row.created_at = new Date(Date.now() - 61 * 60_000).toISOString();
    }
    await expect(otp.isIpLimited('ip-9')).resolves.toBe(false);
  });

  it('caps platform-wide SMS sends per hour', async () => {
    process.env.AUCTION_OTP_SMS_HOURLY_CAP = '2';
    const { issue, sent, age } = setup();
    await expect(
      issue({ channel: 'sms', destination: '+14155550101' }),
    ).resolves.toMatchObject({ sent: true });
    age(61_000);
    await expect(
      issue({ channel: 'sms', destination: '+14155550102' }),
    ).resolves.toMatchObject({ sent: true });
    age(61_000);
    await expect(
      issue({ channel: 'sms', destination: '+14155550103' }),
    ).resolves.toEqual({ sent: false, limited: 'global' });
    expect(sent).toHaveLength(2);
  });

  it('keeps email and sms codes independent', async () => {
    const { issue, sent, verify } = setup();
    await issue();
    await issue({ channel: 'sms', destination: PHONE });
    await expect(verify(sent[0].code, 'email')).resolves.toBe('ok');
    await expect(verify(sent[1].code, 'sms')).resolves.toBe('ok');
  });

  it('still counts a send whose delivery failed', async () => {
    const { db, otp, delivery } = setup();
    (delivery.send as jest.Mock).mockResolvedValueOnce(false);
    await expect(
      otp.issue({
        bidderId: BIDDER_ID,
        channel: 'email',
        destination: EMAIL,
        ipHash: 'ip-1',
      }),
    ).resolves.toEqual({ sent: true, delivered: false });
    expect(db.table('auction_otps')).toHaveLength(1);
  });
});
