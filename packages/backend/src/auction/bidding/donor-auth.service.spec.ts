import { BidderAuthService } from './bidder-auth.service';
import {
  DONOR_TOKEN_TTL_SECONDS,
  DonorAuthService,
  readDonorTokens,
} from './donor-auth.service';
import { AUCTION_ID, makeBiddingDb } from './fake-supabase.testutil';

const OTHER_AUCTION = '33333333-3333-4333-8333-333333333333';
const PHONE = '+14155550123';

describe('DonorAuthService', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.AUCTION_SESSION_SECRET = 'd'.repeat(40);
  });
  afterEach(() => {
    process.env = { ...env };
  });

  function setup() {
    const bidderAuth = new BidderAuthService(makeBiddingDb().asService());
    return { bidderAuth, donor: new DonorAuthService(bidderAuth) };
  }

  it('signs a ~30 minute token that verifies for the same auction', () => {
    const { donor } = setup();
    const { token, expiresInSeconds } = donor.signToken(AUCTION_ID, PHONE);
    expect(expiresInSeconds).toBe(DONOR_TOKEN_TTL_SECONDS);
    expect(DONOR_TOKEN_TTL_SECONDS).toBe(30 * 60);
    const payload = donor.verifyToken(token, AUCTION_ID);
    expect(payload).toMatchObject({ purpose: 'donor', auction_id: AUCTION_ID });
    expect(donor.isTokenPhone(payload!, AUCTION_ID, PHONE)).toBe(true);
  });

  it('never places the phone number in the token', () => {
    const { donor } = setup();
    const { token } = donor.signToken(AUCTION_ID, PHONE);
    const decoded = Buffer.from(token.split('.')[0], 'base64url').toString();
    expect(decoded).not.toContain('4155550123');
  });

  it('expires', () => {
    const { donor } = setup();
    const now = Date.now();
    const { token } = donor.signToken(AUCTION_ID, PHONE, now);
    expect(
      donor.verifyToken(
        token,
        AUCTION_ID,
        now + (DONOR_TOKEN_TTL_SECONDS - 5) * 1000,
      ),
    ).not.toBeNull();
    expect(
      donor.verifyToken(
        token,
        AUCTION_ID,
        now + (DONOR_TOKEN_TTL_SECONDS + 1) * 1000,
      ),
    ).toBeNull();
  });

  it('is bound to the auction', () => {
    const { donor } = setup();
    const { token } = donor.signToken(AUCTION_ID, PHONE);
    expect(donor.verifyToken(token, OTHER_AUCTION)).toBeNull();
  });

  it('does not match a different phone number', () => {
    const { donor } = setup();
    const { token } = donor.signToken(AUCTION_ID, PHONE);
    const payload = donor.verifyToken(token, AUCTION_ID)!;
    expect(donor.isTokenPhone(payload, AUCTION_ID, '+14155550199')).toBe(false);
  });

  it('rejects tampered payloads and signatures', () => {
    const { donor } = setup();
    const { token } = donor.signToken(AUCTION_ID, PHONE);
    const [body, sig] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, 'base64url').toString()),
        exp: 9_999_999_999,
      }),
    ).toString('base64url');
    expect(donor.verifyToken(`${forged}.${sig}`, AUCTION_ID)).toBeNull();
    expect(
      donor.verifyToken(`${body}.${sig.slice(0, -2)}AA`, AUCTION_ID),
    ).toBeNull();
    expect(donor.verifyToken(body, AUCTION_ID)).toBeNull();
    expect(donor.verifyToken('', AUCTION_ID)).toBeNull();
    expect(donor.verifyToken(undefined, AUCTION_ID)).toBeNull();
    expect(donor.verifyToken('x'.repeat(2000), AUCTION_ID)).toBeNull();
  });

  it('is not interchangeable with bidder tokens, in either direction', () => {
    const { donor, bidderAuth } = setup();
    const bidder = bidderAuth.signToken('b1', AUCTION_ID, 0).token;
    expect(donor.verifyToken(bidder, AUCTION_ID)).toBeNull();
    const donorToken = donor.signToken(AUCTION_ID, PHONE).token;
    expect(bidderAuth.verifyToken(donorToken)).toBeNull();
  });

  it('rejects a token signed with another secret', () => {
    const { donor } = setup();
    const { token } = donor.signToken(AUCTION_ID, PHONE);
    process.env.AUCTION_SESSION_SECRET = 'e'.repeat(40);
    const { donor: other } = setup();
    expect(other.verifyToken(token, AUCTION_ID)).toBeNull();
  });

  it('reads x-auction-token first, then Authorization (Bearer or bare)', () => {
    expect(
      readDonorTokens({
        headers: { 'x-auction-token': 'a', authorization: 'Bearer b' },
      }),
    ).toEqual(['a', 'b']);
    expect(readDonorTokens({ headers: { authorization: 'c' } })).toEqual(['c']);
    expect(readDonorTokens({ headers: {} })).toEqual([]);
  });

  it('fromRequest skips an unrelated Authorization value and finds the donor token', () => {
    const { donor } = setup();
    const { token } = donor.signToken(AUCTION_ID, PHONE);
    expect(
      donor.fromRequest(
        {
          headers: {
            authorization: 'Bearer supabase.jwt.value',
            'x-auction-token': token,
          },
        },
        AUCTION_ID,
      ),
    ).not.toBeNull();
    expect(
      donor.fromRequest(
        { headers: { authorization: `Bearer ${token}` } },
        AUCTION_ID,
      ),
    ).not.toBeNull();
    expect(donor.fromRequest({ headers: {} }, AUCTION_ID)).toBeNull();
  });
});
