import { BidderAuthService } from './bidder-auth.service';
import {
  OTP_MAX_PER_DESTINATION_10_MIN,
  OTP_MAX_PER_IP_HOUR,
  OTP_MAX_VERIFY_ATTEMPTS,
  OTP_TTL_MS,
} from './bidder-otp.service';
import { DonorOtpService } from './donor-otp.service';
import type { AuctionOtpDelivery } from './auction-otp-delivery.service';
import { AUCTION_ID, makeBiddingDb } from './fake-supabase.testutil';

const PHONE = '+14155550123';

describe('DonorOtpService', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.AUCTION_SESSION_SECRET = 'o'.repeat(40);
    delete process.env.AUCTION_OTP_SMS_HOURLY_CAP;
  });
  afterEach(() => {
    process.env = { ...env };
  });

  function setup() {
    const db = makeBiddingDb();
    const sent: Array<{ channel: string; destination: string; code: string }> =
      [];
    const delivery = {
      send: jest.fn((channel: string, destination: string, code: string) => {
        sent.push({ channel, destination, code });
        return Promise.resolve(true);
      }),
    } as unknown as AuctionOtpDelivery;
    const auth = new BidderAuthService(db.asService());
    const otp = new DonorOtpService(db.asService(), auth, delivery);
    const lastCode = () => sent[sent.length - 1].code;
    const age = (ms: number) => {
      for (const row of db.table('auction_donor_otps')) {
        row.created_at = new Date(
          new Date(row.created_at).getTime() - ms,
        ).toISOString();
      }
    };
    const issue = (
      overrides: Partial<Parameters<DonorOtpService['issue']>[0]> = {},
    ) =>
      otp.issue({
        auctionId: AUCTION_ID,
        phone: PHONE,
        ipHash: 'ip-1',
        ...overrides,
      });
    const verify = (code: string, phone = PHONE) =>
      otp.verify({ auctionId: AUCTION_ID, phone, code });
    return { db, otp, sent, lastCode, age, issue, verify };
  }

  it('texts a 6-digit code and stores only its HMAC hash', async () => {
    const { db, issue, lastCode, otp, sent } = setup();
    await expect(issue()).resolves.toEqual({ sent: true, delivered: true });
    expect(sent[0]).toMatchObject({ channel: 'sms', destination: PHONE });
    const code = lastCode();
    expect(code).toMatch(/^\d{6}$/);
    const [row] = db.table('auction_donor_otps');
    expect(JSON.stringify(row)).not.toContain(code);
    expect(row.code_hash).toBe(otp.hashCode(AUCTION_ID, PHONE, code));
    expect(row.ip_hash).toBe('ip-1');
    expect(new Date(row.expires_at).getTime() - Date.now()).toBeLessThanOrEqual(
      OTP_TTL_MS,
    );
  });

  it('binds the hash to auction and phone', () => {
    const { otp } = setup();
    const base = otp.hashCode(AUCTION_ID, PHONE, '123456');
    expect(otp.hashCode('other', PHONE, '123456')).not.toBe(base);
    expect(otp.hashCode(AUCTION_ID, '+14155550199', '123456')).not.toBe(base);
  });

  it('enforces the resend cooldown', async () => {
    const { issue } = setup();
    await issue();
    await expect(issue()).resolves.toEqual({
      sent: false,
      limited: 'cooldown',
    });
  });

  it('limits codes per phone in 10 minutes', async () => {
    const { issue, age, sent } = setup();
    for (let i = 0; i < OTP_MAX_PER_DESTINATION_10_MIN; i++) {
      await expect(issue()).resolves.toMatchObject({ sent: true });
      age(61_000);
    }
    await expect(issue()).resolves.toEqual({
      sent: false,
      limited: 'destination',
    });
    expect(sent).toHaveLength(OTP_MAX_PER_DESTINATION_10_MIN);
  });

  it('limits codes per client IP per hour', async () => {
    const { issue, db } = setup();
    for (let i = 0; i < OTP_MAX_PER_IP_HOUR; i++) {
      db.table('auction_donor_otps').push({
        id: `seed-${i}`,
        auction_id: AUCTION_ID,
        phone: `+1415555${String(1000 + i)}`,
        ip_hash: 'ip-1',
        created_at: new Date().toISOString(),
      });
    }
    await expect(issue()).resolves.toEqual({ sent: false, limited: 'ip' });
    await expect(issue({ ipHash: 'ip-2' })).resolves.toMatchObject({
      sent: true,
    });
  });

  it('applies the platform-wide hourly SMS cap across donors and bidders', async () => {
    const { issue, db } = setup();
    process.env.AUCTION_OTP_SMS_HOURLY_CAP = '2';
    db.table('auction_otps').push({
      id: 'b1',
      channel: 'sms',
      created_at: new Date().toISOString(),
    });
    db.table('auction_donor_otps').push({
      id: 'd1',
      auction_id: AUCTION_ID,
      phone: '+14155550000',
      created_at: new Date().toISOString(),
    });
    await expect(issue()).resolves.toEqual({ sent: false, limited: 'global' });
  });

  it('verifies the right code once and consumes it', async () => {
    const { issue, verify, lastCode } = setup();
    await issue();
    const code = lastCode();
    await expect(verify(code)).resolves.toBe('ok');
    await expect(verify(code)).resolves.toBe('invalid');
  });

  it('a code for one phone does not verify another phone', async () => {
    const { issue, verify, lastCode } = setup();
    await issue();
    await expect(verify(lastCode(), '+14155550199')).resolves.toBe('invalid');
  });

  it('rejects wrong codes, then locks after the attempt limit', async () => {
    const { issue, verify, lastCode } = setup();
    await issue();
    const good = lastCode();
    const wrong = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < OTP_MAX_VERIFY_ATTEMPTS - 1; i++) {
      await expect(verify(wrong)).resolves.toBe('invalid');
    }
    await expect(verify(wrong)).resolves.toBe('locked');
    await expect(verify(good)).resolves.toBe('expired');
  });

  it('expires after the TTL', async () => {
    const { issue, verify, lastCode, db } = setup();
    await issue();
    db.table('auction_donor_otps')[0].expires_at = new Date(
      Date.now() - 1000,
    ).toISOString();
    await expect(verify(lastCode())).resolves.toBe('expired');
  });

  it('a newer code supersedes the older one', async () => {
    const { issue, verify, lastCode, age } = setup();
    await issue();
    const first = lastCode();
    age(61_000);
    await issue();
    const second = lastCode();
    if (first !== second) await expect(verify(first)).resolves.not.toBe('ok');
    await expect(verify(second)).resolves.toBe('ok');
  });

  it('with the local dev bypass on, nothing is texted and the code is returned and verifies', async () => {
    process.env.AUCTION_DEV_OTP_BYPASS = 'true';
    process.env.NODE_ENV = 'development';
    delete process.env.RENDER;
    const { issue, verify, sent } = setup();
    const result = await issue();
    expect(sent).toHaveLength(0);
    expect(result).toMatchObject({ sent: true, delivered: false });
    const devCode = (result as { devCode?: string }).devCode;
    expect(devCode).toMatch(/^\d{6}$/);
    await expect(verify(devCode as string)).resolves.toBe('ok');
  });

  it('never returns the code and still texts it when the bypass flag is off', async () => {
    delete process.env.AUCTION_DEV_OTP_BYPASS;
    const { issue, sent } = setup();
    const result = await issue();
    expect(sent).toHaveLength(1);
    expect(result).toEqual({ sent: true, delivered: true });
  });

  it('ignores the bypass flag in production', async () => {
    process.env.AUCTION_DEV_OTP_BYPASS = 'true';
    process.env.NODE_ENV = 'production';
    const { issue, sent } = setup();
    const result = await issue();
    expect(sent).toHaveLength(1);
    expect(result).toEqual({ sent: true, delivered: true });
  });
});
