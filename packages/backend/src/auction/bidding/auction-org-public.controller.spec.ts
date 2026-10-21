import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { SupabaseModule } from '../../supabase/supabase.module';
import { SupabaseService } from '../../supabase/supabase.service';
import { AuctionBiddingModule } from './auction-bidding.module';
import { AuctionOtpDelivery } from './auction-otp-delivery.service';
import {
  AUCTION_ID,
  liveAuctionRow,
  makeBiddingDb,
} from './fake-supabase.testutil';
import type { Row } from './fake-supabase.testutil';

// messaging.module imports `.js` specifiers jest cannot resolve; swap in a module exposing the real TwilioService.
jest.mock('../../messaging/messaging.module', () => {
  const { Module } = jest.requireActual('@nestjs/common');
  const { ConfigModule } = jest.requireActual('@nestjs/config');
  const { TwilioService } = jest.requireActual(
    '../../messaging/twilio.service',
  );
  class MessagingModule {}
  Module({
    imports: [ConfigModule],
    providers: [TwilioService],
    exports: [TwilioService],
  })(MessagingModule);
  return { MessagingModule };
});
jest.mock('../admin/auction-image', () => ({
  storeAuctionImage: jest
    .fn()
    .mockResolvedValue(
      'https://demo.supabase.co/storage/v1/object/public/auction-images/donations/x/y.webp',
    ),
  AUCTION_IMAGE_MAX_BYTES: 5 * 1024 * 1024,
}));

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PHONE = '+14155550123';
const HOST = 'https://demo.supabase.co';
const base = '/auctions/public';

const org = (over: Row = {}): Row => ({
  id: ORG_ID,
  promoter_account_id: 'promoter-secret',
  slug: 'helping-hands',
  name: 'Helping Hands',
  story: 'Our story',
  goal_cents: 1000,
  impact_examples: [],
  social: {},
  is_published: true,
  promoter_accounts: { is_nonprofit: true, nonprofit_status: 'verified' },
  ...over,
});

const draftAuction = (over: Row = {}): Row =>
  liveAuctionRow({
    status: 'draft',
    starts_at: null,
    ends_at: null,
    organization_id: ORG_ID,
    slug: 'spring-gala',
    accepts_donations: true,
    donations_close_at: null,
    page_published: true,
    organization: { slug: 'helping-hands', is_published: true },
    ...over,
  });

describe('Organization pages and donations (HTTP)', () => {
  const env = { ...process.env };
  let app: INestApplication;
  const codes: string[] = [];

  async function boot(tables: Record<string, Row[]> = {}) {
    const db = makeBiddingDb({
      auctions: [draftAuction()],
      auction_organizations: [org()],
      auction_org_gallery: [],
      auction_org_sponsors: [],
      auction_items: [],
      ...tables,
    });
    const moduleRef = await Test.createTestingModule({
      imports: [SupabaseModule, AuctionBiddingModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(db.asService())
      .overrideProvider(AuctionOtpDelivery)
      .useValue({
        send: (_c: string, _d: string, code: string) => {
          codes.push(code);
          return Promise.resolve(true);
        },
      })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
    return db;
  }

  beforeEach(() => {
    codes.length = 0;
    process.env.AUCTION_SESSION_SECRET = 'h'.repeat(40);
    process.env.AUCTIONS_ENABLED = 'true';
    process.env.SUPABASE_URL = HOST;
  });
  afterEach(async () => {
    process.env = { ...env };
    await app?.close();
  });

  it.each([
    ['unset', undefined],
    ['false', 'false'],
  ])(
    'answers 404 on every new public route when AUCTIONS_ENABLED is %s',
    async (_n, value) => {
      if (value === undefined) delete process.env.AUCTIONS_ENABLED;
      else process.env.AUCTIONS_ENABLED = value;
      await boot();
      const http = request(app.getHttpServer());
      for (const path of [
        `${base}/organizations/helping-hands`,
        `${base}/resolve/helping-hands/spring-gala`,
        `${base}/${AUCTION_ID}/story`,
      ]) {
        expect((await http.get(path)).status).toBe(404);
      }
      for (const path of [
        `${base}/${AUCTION_ID}/donations/otp`,
        `${base}/${AUCTION_ID}/donations/verify`,
        `${base}/${AUCTION_ID}/donations/upload-image`,
        `${base}/${AUCTION_ID}/donations`,
      ]) {
        expect((await http.post(path).send({})).status).toBe(404);
      }
    },
  );

  it('serves the organization page, slug resolution and story', async () => {
    await boot();
    const http = request(app.getHttpServer());
    const page = await http.get(`${base}/organizations/helping-hands`);
    expect(page.status).toBe(200);
    expect(page.body.organization.name).toBe('Helping Hands');
    expect(page.body.auctions).toHaveLength(1);
    expect(page.text).not.toContain('promoter-secret');

    const resolved = await http.get(
      `${base}/resolve/helping-hands/spring-gala`,
    );
    expect(resolved.body).toEqual({
      auctionId: AUCTION_ID,
      organizationId: ORG_ID,
    });

    const story = await http.get(`${base}/${AUCTION_ID}/story`);
    expect(story.status).toBe(200);
    expect(story.body.auction).toMatchObject({
      phase: 'accepting_donations',
      org_slug: 'helping-hands',
    });

    // Existing UUID routes keep working next to the new literal routes.
    expect((await http.get(`${base}/${AUCTION_ID}`)).status).toBe(200);
    expect((await http.get(`${base}/${AUCTION_ID}/state`)).status).toBe(200);
  });

  it('answers 404 for an unpublished organization page and malformed ids', async () => {
    await boot({ auction_organizations: [org({ is_published: false })] });
    const http = request(app.getHttpServer());
    expect((await http.get(`${base}/organizations/helping-hands`)).status).toBe(
      404,
    );
    expect(
      (await http.get(`${base}/resolve/helping-hands/spring-gala`)).status,
    ).toBe(404);
    expect((await http.get(`${base}/not-a-uuid/story`)).status).toBe(404);
  });

  it('runs the donor flow: code -> token -> pending donation', async () => {
    const db = await boot();
    const http = request(app.getHttpServer());

    const otp = await http
      .post(`${base}/${AUCTION_ID}/donations/otp`)
      .send({ phone: '(415) 555-0123', name: 'Pat' });
    expect(otp.status).toBe(200);
    expect(otp.body).toEqual({ sent: true });
    expect(codes).toHaveLength(1);

    const bad = await http.post(`${base}/${AUCTION_ID}/donations/verify`).send({
      phone: PHONE,
      code: codes[0] === '000000' ? '111111' : '000000',
    });
    expect(bad.status).toBe(401);
    const verify = await http
      .post(`${base}/${AUCTION_ID}/donations/verify`)
      .send({ phone: PHONE, code: codes[0] });
    expect(verify.status).toBe(200);
    expect(verify.body.expiresInSeconds).toBe(1800);
    const token = verify.body.donorToken as string;

    const body = {
      donor_name: 'Pat Donor',
      donor_email: 'pat@example.com',
      donor_phone: PHONE,
      title: 'Pizza party',
      description: 'Ten pizzas',
      estimated_value_cents: 25_000,
      image_urls: [
        `${HOST}/storage/v1/object/public/auction-images/donations/${AUCTION_ID}/p.webp`,
      ],
      fulfillment_method: 'pickup',
      recognition_ok: true,
    };
    expect(
      (await http.post(`${base}/${AUCTION_ID}/donations`).send(body)).status,
    ).toBe(401);
    expect(
      (
        await http
          .post(`${base}/${AUCTION_ID}/donations`)
          .set('Authorization', `Bearer ${token}`)
          .send({ ...body, donor_phone: '+14155550199' })
      ).status,
    ).toBe(403);
    const ok = await http
      .post(`${base}/${AUCTION_ID}/donations`)
      .set('Authorization', `Bearer ${token}`)
      .send(body);
    expect(ok.status).toBe(201);
    expect(ok.body).toEqual({ id: expect.any(String), status: 'pending' });
    expect(db.table('auction_donations')).toHaveLength(1);

    // The same token works through x-auction-token too.
    const viaHeader = await http
      .post(`${base}/${AUCTION_ID}/donations`)
      .set('x-auction-token', token)
      .send({ ...body, title: 'Second' });
    expect(viaHeader.status).toBe(201);
  });

  it('uploads a photo with a donor token and refuses without one', async () => {
    await boot();
    const http = request(app.getHttpServer());
    await http
      .post(`${base}/${AUCTION_ID}/donations/otp`)
      .send({ phone: PHONE, name: 'Pat' });
    const { body } = await http
      .post(`${base}/${AUCTION_ID}/donations/verify`)
      .send({ phone: PHONE, code: codes[0] });

    const attach = (r: request.Test) =>
      r.attach('file', Buffer.from('fake'), {
        filename: 'a.png',
        contentType: 'image/png',
      });
    expect(
      (await attach(http.post(`${base}/${AUCTION_ID}/donations/upload-image`)))
        .status,
    ).toBe(401);
    const ok = await attach(
      http
        .post(`${base}/${AUCTION_ID}/donations/upload-image`)
        .set('Authorization', `Bearer ${body.donorToken}`),
    );
    expect(ok.status).toBe(200);
    expect(ok.body.url).toContain('/auction-images/donations/');
  });

  it('refuses donations outside the accepting_donations phase', async () => {
    await boot({ auctions: [draftAuction({ accepts_donations: false })] });
    const res = await request(app.getHttpServer())
      .post(`${base}/${AUCTION_ID}/donations/otp`)
      .send({ phone: PHONE, name: 'Pat' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('donations_closed');
    expect(codes).toHaveLength(0);
  });
});
