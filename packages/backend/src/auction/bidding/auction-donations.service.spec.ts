import {
  AuctionDonationsService,
  isDonationImageUrl,
  MAX_DONATIONS_PER_IP_HOUR,
  MAX_DONOR_UPLOADS_PER_SESSION,
  MAX_PENDING_DONATIONS_PER_PHONE,
} from './auction-donations.service';
import { AuctionPublicService } from './auction-public.service';
import { BidderAuthService } from './bidder-auth.service';
import { DonorAuthService } from './donor-auth.service';
import { DonorOtpService } from './donor-otp.service';
import type { AuctionOtpDelivery } from './auction-otp-delivery.service';
import {
  AUCTION_ID,
  liveAuctionRow,
  makeBiddingDb,
} from './fake-supabase.testutil';
import type { Row } from './fake-supabase.testutil';
import { storeAuctionImage } from '../admin/auction-image';

jest.mock('../admin/auction-image', () => ({
  storeAuctionImage: jest.fn(),
  AUCTION_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
}));

const OTHER_AUCTION = '33333333-3333-4333-8333-333333333333';
const PHONE = '+14155550123';
const HOST = 'https://demo.supabase.co';
const photo = (n = 1, auction = AUCTION_ID) =>
  `${HOST}/storage/v1/object/public/auction-images/donations/${auction}/p${n}.webp`;

function draftAuction(overrides: Row = {}): Row {
  return liveAuctionRow({
    status: 'draft',
    starts_at: null,
    ends_at: null,
    accepts_donations: true,
    donations_close_at: null,
    page_published: true,
    organization_id: 'org-1',
    ...overrides,
  });
}

function validBody(overrides: Row = {}): Row {
  return {
    donor_name: 'Pat Donor',
    donor_business: 'Pat Pizza',
    donor_email: 'pat@example.com',
    donor_phone: PHONE,
    title: 'Pizza party',
    description: 'Ten large pizzas',
    estimated_value_cents: 25_000,
    image_urls: [photo()],
    fulfillment_method: 'pickup',
    recognition_ok: true,
    ...overrides,
  };
}

describe('AuctionDonationsService', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.AUCTION_SESSION_SECRET = 'q'.repeat(40);
    process.env.SUPABASE_URL = HOST;
    delete process.env.AUCTION_OTP_SMS_HOURLY_CAP;
    (storeAuctionImage as jest.Mock).mockReset();
  });
  afterEach(() => {
    process.env = { ...env };
  });

  function setup(
    auction: Row = draftAuction(),
    tables: Record<string, Row[]> = {},
  ) {
    const db = makeBiddingDb({ ...tables, auctions: [auction] });
    const sent: string[] = [];
    const delivery = {
      send: jest.fn((_c: string, _d: string, code: string) => {
        sent.push(code);
        return Promise.resolve(true);
      }),
    } as unknown as AuctionOtpDelivery;
    const svc = db.asService();
    const auth = new BidderAuthService(svc);
    const donorAuth = new DonorAuthService(auth);
    const otp = new DonorOtpService(svc, auth, delivery);
    const service = new AuctionDonationsService(
      svc,
      new AuctionPublicService(svc),
      otp,
      donorAuth,
      auth,
    );
    const token = (phone = PHONE, auctionId = AUCTION_ID, nowMs?: number) => ({
      headers: {
        'x-auction-token': donorAuth.signToken(auctionId, phone, nowMs).token,
      },
    });
    return { db, service, sent, delivery, donorAuth, token };
  }

  const status = async (promise: Promise<unknown>) => {
    try {
      await promise;
      return 200;
    } catch (err) {
      return (err as { getStatus: () => number }).getStatus();
    }
  };

  describe('SMS code', () => {
    it('texts a code while the auction accepts donations', async () => {
      const { service, sent, db } = setup();
      await expect(
        service.startOtp(
          AUCTION_ID,
          { phone: '(415) 555-0123', name: 'Pat' },
          '203.0.113.5',
        ),
      ).resolves.toEqual({ sent: true });
      expect(sent).toHaveLength(1);
      const [row] = db.table('auction_donor_otps');
      expect(row.phone).toBe(PHONE);
      expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(row)).not.toContain('203.0.113.5');
    });

    it('swallows honeypot submissions without sending anything', async () => {
      const { service, sent, db } = setup();
      await expect(
        service.startOtp(
          AUCTION_ID,
          { phone: PHONE, name: 'Bot', website: 'http://spam' },
          'ip',
        ),
      ).resolves.toEqual({ sent: true });
      expect(sent).toHaveLength(0);
      expect(db.table('auction_donor_otps')).toHaveLength(0);
    });

    it('answers 429 with the limit reason when throttled', async () => {
      const { service } = setup();
      await service.startOtp(AUCTION_ID, { phone: PHONE, name: 'Pat' }, 'ip');
      await expect(
        service.startOtp(AUCTION_ID, { phone: PHONE, name: 'Pat' }, 'ip'),
      ).rejects.toMatchObject({
        status: 429,
        response: { code: 'rate_limited', limited: 'cooldown' },
      });
    });

    it.each([
      [
        'not accepting donations',
        draftAuction({ accepts_donations: false }),
        409,
      ],
      [
        'donation window closed',
        draftAuction({ donations_close_at: '2000-01-01T00:00:00Z' }),
        409,
      ],
      ['bidding live', draftAuction({ status: 'live' }), 409],
      ['page not published', draftAuction({ page_published: false }), 404],
      ['cancelled', draftAuction({ status: 'cancelled' }), 404],
    ])('refuses when %s', async (_label, auction, expected) => {
      const { service, sent } = setup(auction);
      expect(
        await status(
          service.startOtp(AUCTION_ID, { phone: PHONE, name: 'Pat' }, 'ip'),
        ),
      ).toBe(expected);
      expect(sent).toHaveLength(0);
    });

    it('rejects a malformed phone before doing any work', async () => {
      const { service, db } = setup();
      expect(
        await status(
          service.startOtp(AUCTION_ID, { phone: '123', name: 'Pat' }, 'ip'),
        ),
      ).toBe(400);
      expect(db.table('auction_donor_otps')).toHaveLength(0);
    });

    it('verifies the code and issues a donor token bound to that phone', async () => {
      const { service, sent, donorAuth } = setup();
      await service.startOtp(AUCTION_ID, { phone: PHONE, name: 'Pat' }, 'ip');
      const out = await service.verifyOtp(AUCTION_ID, {
        phone: PHONE,
        code: sent[0],
      });
      expect(out.expiresInSeconds).toBe(1800);
      const payload = donorAuth.verifyToken(out.donorToken, AUCTION_ID)!;
      expect(donorAuth.isTokenPhone(payload, AUCTION_ID, PHONE)).toBe(true);
    });

    it('rejects a wrong code with 401 and no token', async () => {
      const { service, sent } = setup();
      await service.startOtp(AUCTION_ID, { phone: PHONE, name: 'Pat' }, 'ip');
      const wrong = sent[0] === '123456' ? '654321' : '123456';
      expect(
        await status(
          service.verifyOtp(AUCTION_ID, { phone: PHONE, code: wrong }),
        ),
      ).toBe(401);
    });

    it('does not verify a code for a different phone', async () => {
      const { service, sent } = setup();
      await service.startOtp(AUCTION_ID, { phone: PHONE, name: 'Pat' }, 'ip');
      expect(
        await status(
          service.verifyOtp(AUCTION_ID, {
            phone: '+14155550199',
            code: sent[0],
          }),
        ),
      ).toBe(401);
    });
  });

  describe('submit', () => {
    const submit = (
      s: ReturnType<typeof setup>,
      body: Row = validBody(),
      request: object = s.token(),
      ip = '203.0.113.5',
    ) => s.service.submit(AUCTION_ID, body, request, ip);

    it('stores a pending donation tied to the verified phone', async () => {
      const s = setup();
      const out = await submit(s);
      expect(out).toEqual({ id: expect.any(String), status: 'pending' });
      const [row] = s.db.table('auction_donations');
      expect(row).toMatchObject({
        id: out.id,
        auction_id: AUCTION_ID,
        organization_id: 'org-1',
        donor_name: 'Pat Donor',
        donor_email: 'pat@example.com',
        donor_phone: PHONE,
        title: 'Pizza party',
        estimated_value_cents: 25_000,
        fulfillment_method: 'pickup',
        recognition_ok: true,
        status: 'pending',
      });
      expect(row.phone_verified_at).toEqual(expect.any(String));
      expect(row.ip_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(JSON.stringify(row)).not.toContain('203.0.113.5');
    });

    it('defaults recognition to off when it is not sent', async () => {
      const s = setup();
      const body = validBody();
      delete body.recognition_ok;
      await submit(s, body);
      expect(s.db.table('auction_donations')[0].recognition_ok).toBe(false);
    });

    it('requires a donor token', async () => {
      const s = setup();
      expect(await status(submit(s, validBody(), { headers: {} }))).toBe(401);
      expect(
        await status(
          submit(s, validBody(), { headers: { 'x-auction-token': 'junk' } }),
        ),
      ).toBe(401);
      expect(s.db.table('auction_donations')).toHaveLength(0);
    });

    it('rejects a token issued for another auction', async () => {
      const s = setup();
      expect(
        await status(submit(s, validBody(), s.token(PHONE, OTHER_AUCTION))),
      ).toBe(401);
    });

    it('rejects an expired token', async () => {
      const s = setup();
      const stale = s.token(PHONE, AUCTION_ID, Date.now() - 31 * 60_000);
      expect(await status(submit(s, validBody(), stale))).toBe(401);
    });

    it('rejects a donor_phone that is not the verified phone', async () => {
      const s = setup();
      await expect(
        submit(s, validBody({ donor_phone: '+14155550199' })),
      ).rejects.toMatchObject({
        status: 403,
        response: { code: 'phone_mismatch' },
      });
      expect(s.db.table('auction_donations')).toHaveLength(0);
    });

    it('rejects a token whose body was tampered with', async () => {
      const s = setup();
      const [body, sig] = s.token().headers['x-auction-token'].split('.');
      const forged = Buffer.from(
        JSON.stringify({
          ...JSON.parse(Buffer.from(body, 'base64url').toString()),
          phone_hash: 'ab',
        }),
      ).toString('base64url');
      expect(
        await status(
          submit(s, validBody(), {
            headers: { 'x-auction-token': `${forged}.${sig}` },
          }),
        ),
      ).toBe(401);
    });

    it('silently drops honeypot submissions', async () => {
      const s = setup();
      const out = await submit(
        s,
        validBody({ website: 'http://spam.example' }),
      );
      expect(out.status).toBe('pending');
      expect(s.db.table('auction_donations')).toHaveLength(0);
    });

    it.each([
      [
        'accepts_donations off',
        draftAuction({ accepts_donations: false }),
        409,
      ],
      [
        'window closed',
        draftAuction({ donations_close_at: '2000-01-01T00:00:00Z' }),
        409,
      ],
      ['auction live', draftAuction({ status: 'live' }), 409],
      ['auction closed', draftAuction({ status: 'closed' }), 409],
      ['page unpublished', draftAuction({ page_published: false }), 404],
    ])(
      'only accepts donations during accepting_donations (%s)',
      async (_l, auction, expected) => {
        const s = setup(auction);
        expect(await status(submit(s))).toBe(expected);
        expect(s.db.table('auction_donations')).toHaveLength(0);
      },
    );

    it('stays open until donations_close_at', async () => {
      const s = setup(
        draftAuction({
          donations_close_at: new Date(Date.now() + 3_600_000).toISOString(),
        }),
      );
      await expect(submit(s)).resolves.toMatchObject({ status: 'pending' });
    });

    it.each([
      ['no title', { title: '' }],
      ['title too long', { title: 'x'.repeat(201) }],
      ['bad email', { donor_email: 'nope' }],
      ['negative value', { estimated_value_cents: -1 }],
      ['fractional value', { estimated_value_cents: 10.5 }],
      ['missing value', { estimated_value_cents: undefined }],
      ['bad fulfillment', { fulfillment_method: 'teleport' }],
      [
        'too many photos',
        { image_urls: Array.from({ length: 7 }, (_v, i) => photo(i)) },
      ],
      ['non-https photo', { image_urls: ['http://x.test/a.webp'] }],
      ['bad expiry date', { expires_on: '2026-13-45' }],
      ['description too long', { description: 'x'.repeat(5001) }],
    ])('validates fields (%s)', async (_label, patch) => {
      const s = setup();
      expect(await status(submit(s, validBody(patch)))).toBe(400);
      expect(s.db.table('auction_donations')).toHaveLength(0);
    });

    it('accepts up to 6 photos from this donation flow', async () => {
      const s = setup();
      await expect(
        submit(
          s,
          validBody({
            image_urls: Array.from({ length: 6 }, (_v, i) => photo(i)),
          }),
        ),
      ).resolves.toMatchObject({ status: 'pending' });
    });

    it('only accepts photos uploaded through this form for this auction', async () => {
      const s = setup();
      expect(
        await status(
          submit(s, validBody({ image_urls: ['https://evil.example/a.webp'] })),
        ),
      ).toBe(400);
      expect(
        await status(
          submit(s, validBody({ image_urls: [photo(1, OTHER_AUCTION)] })),
        ),
      ).toBe(400);
    });

    it('caps pending donations per phone per auction', async () => {
      const s = setup();
      for (let i = 0; i < MAX_PENDING_DONATIONS_PER_PHONE; i++) {
        await submit(
          s,
          validBody({ title: `Item ${i}` }),
          s.token(),
          `198.51.100.${i}`,
        );
      }
      await expect(
        submit(s, validBody({ title: 'One more' }), s.token(), '198.51.100.99'),
      ).rejects.toMatchObject({
        status: 429,
        response: { code: 'too_many_pending' },
      });
      expect(s.db.table('auction_donations')).toHaveLength(
        MAX_PENDING_DONATIONS_PER_PHONE,
      );
    });

    it('lets a phone donate again once earlier ones are reviewed', async () => {
      const s = setup();
      for (let i = 0; i < MAX_PENDING_DONATIONS_PER_PHONE; i++) {
        await submit(
          s,
          validBody({ title: `Item ${i}` }),
          s.token(),
          `198.51.100.${i}`,
        );
      }
      s.db.table('auction_donations')[0].status = 'approved';
      await expect(
        submit(s, validBody({ title: 'Next' }), s.token(), '198.51.100.99'),
      ).resolves.toBeDefined();
    });

    it('limits submissions per client IP per hour', async () => {
      const s = setup();
      for (let i = 0; i < MAX_DONATIONS_PER_IP_HOUR; i++) {
        const phone = `+1415555${String(2000 + i)}`;
        // Seed already-reviewed rows so the per-phone pending cap is not what triggers.
        await submit(
          s,
          validBody({ donor_phone: phone, title: `T${i}` }),
          s.token(phone),
          '203.0.113.9',
        );
        s.db.table('auction_donations')[i].status = 'declined';
      }
      await expect(
        submit(
          s,
          validBody({ donor_phone: '+14155559999' }),
          s.token('+14155559999'),
          '203.0.113.9',
        ),
      ).rejects.toMatchObject({
        status: 429,
        response: { code: 'rate_limited' },
      });
      await expect(
        submit(
          s,
          validBody({ donor_phone: '+14155559999' }),
          s.token('+14155559999'),
          '203.0.113.10',
        ),
      ).resolves.toBeDefined();
    });
  });

  describe('upload', () => {
    const file = { mimetype: 'image/png', size: 10, buffer: Buffer.from('x') };

    it("stores into this auction's donation folder and returns the url", async () => {
      (storeAuctionImage as jest.Mock).mockResolvedValue(photo());
      const s = setup();
      await expect(
        s.service.uploadImage(AUCTION_ID, file, s.token()),
      ).resolves.toEqual({ url: photo() });
      expect(storeAuctionImage).toHaveBeenCalledWith(
        expect.anything(),
        file,
        `donations/${AUCTION_ID}`,
      );
    });

    it('needs a valid donor token and an auction accepting donations', async () => {
      const s = setup();
      expect(
        await status(s.service.uploadImage(AUCTION_ID, file, { headers: {} })),
      ).toBe(401);
      expect(
        await status(
          s.service.uploadImage(
            AUCTION_ID,
            file,
            s.token(PHONE, OTHER_AUCTION),
          ),
        ),
      ).toBe(401);
      const closed = setup(draftAuction({ status: 'live' }));
      expect(
        await status(
          closed.service.uploadImage(AUCTION_ID, file, closed.token()),
        ),
      ).toBe(409);
      expect(storeAuctionImage).not.toHaveBeenCalled();
    });

    it('caps uploads per verified phone', async () => {
      (storeAuctionImage as jest.Mock).mockResolvedValue(photo());
      const s = setup();
      for (let i = 0; i < MAX_DONOR_UPLOADS_PER_SESSION; i++) {
        await s.service.uploadImage(AUCTION_ID, file, s.token());
      }
      expect(
        await status(s.service.uploadImage(AUCTION_ID, file, s.token())),
      ).toBe(429);
    });
  });
});

describe('isDonationImageUrl', () => {
  const env = { ...process.env };
  afterEach(() => {
    process.env = { ...env };
  });

  it('accepts only https webp files in the auction donation folder of our storage', () => {
    process.env.SUPABASE_URL = HOST;
    expect(isDonationImageUrl(photo(), AUCTION_ID)).toBe(true);
    expect(isDonationImageUrl(photo(1, OTHER_AUCTION), AUCTION_ID)).toBe(false);
    expect(isDonationImageUrl(`${photo()}?x=1`, AUCTION_ID)).toBe(false);
    expect(
      isDonationImageUrl(photo().replace('https', 'http'), AUCTION_ID),
    ).toBe(false);
    expect(
      isDonationImageUrl(
        photo().replace('demo.supabase.co', 'evil.example'),
        AUCTION_ID,
      ),
    ).toBe(false);
    expect(isDonationImageUrl('not a url', AUCTION_ID)).toBe(false);
  });
});
