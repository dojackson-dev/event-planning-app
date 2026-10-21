import { Global, INestApplication, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { PromoterAccessService } from '../../promoter-team/promoter-access.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { makeBiddingDb } from '../bidding/fake-supabase.testutil';
import type { Row } from '../bidding/fake-supabase.testutil';
import { AuctionAdminModule } from './auction-admin.module';

const A1 = '11111111-1111-4111-8111-111111111111';
const D1 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const auth = { Authorization: 'Bearer local-user-1' };

// Guards route order: the literal `organization` / `donations/...` paths must not be read as auction `:id` routes.
describe('Organizer routes (HTTP)', () => {
  const env = { ...process.env };
  let app: INestApplication;

  async function boot(tables: Record<string, Row[]> = {}) {
    const db = makeBiddingDb({
      promoter_accounts: [
        {
          id: 'p1',
          user_id: 'user-1',
          company_name: 'A',
          is_nonprofit: true,
          nonprofit_status: 'verified',
          nonprofit_ein: null,
        },
      ],
      auctions: [
        {
          id: A1,
          promoter_account_id: 'p1',
          status: 'draft',
          title: 'Mine',
          starts_at: null,
          ends_at: null,
        },
      ],
      auction_organizations: [],
      auction_org_gallery: [],
      auction_org_sponsors: [],
      auction_donations: [
        {
          id: D1,
          auction_id: A1,
          donor_name: 'Pat',
          title: 'Pizza',
          description: null,
          category: null,
          estimated_value_cents: 100,
          image_urls: [],
          recognition_ok: false,
          status: 'pending',
          item_id: null,
        },
      ],
      auction_items: [],
      auction_audit: [],
      ...tables,
    });
    const access = { resolveUserId: (id: string) => Promise.resolve(id) };
    @Global()
    @Module({
      providers: [
        { provide: SupabaseService, useValue: db.asService() },
        { provide: PromoterAccessService, useValue: access },
      ],
      exports: [SupabaseService, PromoterAccessService],
    })
    class StubGlobalModule {}
    const moduleRef = await Test.createTestingModule({
      imports: [StubGlobalModule, AuctionAdminModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    return db;
  }

  beforeEach(() => {
    process.env.ALLOW_LOCAL_DEV_AUTH = 'true';
  });
  afterEach(async () => {
    process.env = { ...env };
    await app?.close();
  });

  it('routes organization, gallery and sponsor endpoints to the organization controller', async () => {
    await boot();
    const http = request(app.getHttpServer());

    const empty = await http.get('/auctions/manage/organization').set(auth);
    expect(empty.status).toBe(200);
    expect(empty.text).toBe('');

    const put = await http
      .put('/auctions/manage/organization')
      .set(auth)
      .send({ slug: 'helping-hands', name: 'Helping Hands' });
    expect(put.status).toBe(200);
    expect(put.body).toMatchObject({
      slug: 'helping-hands',
      gallery: [],
      sponsors: [],
    });

    const avail = await http
      .get('/auctions/manage/organization/slug-available?slug=fresh-one')
      .set(auth);
    expect(avail.body).toEqual({ available: true });

    const gallery = await http
      .post('/auctions/manage/organization/gallery')
      .set(auth)
      .send({ image_url: 'https://img.test/a.webp' });
    expect(gallery.status).toBe(201);
    const reorder = await http
      .put('/auctions/manage/organization/gallery-order')
      .set(auth)
      .send({ ids: [gallery.body.id] });
    expect(reorder.status).toBe(200);
    const sponsor = await http
      .post('/auctions/manage/organization/sponsors')
      .set(auth)
      .send({ name: 'Acme', permission_confirmed: true });
    expect(sponsor.body.permission_confirmed).toBe(true);
    expect(
      (
        await http
          .put(`/auctions/manage/organization/sponsors/${sponsor.body.id}`)
          .set(auth)
          .send({ tier: 'Gold' })
      ).body.tier,
    ).toBe('Gold');
    expect(
      (
        await http
          .delete(`/auctions/manage/organization/sponsors/${sponsor.body.id}`)
          .set(auth)
      ).body,
    ).toEqual({ ok: true });
    expect(
      (
        await http
          .delete(`/auctions/manage/organization/gallery/${gallery.body.id}`)
          .set(auth)
      ).status,
    ).toBe(200);
  });

  it('routes donation endpoints, and leaves the existing :id routes alone', async () => {
    await boot();
    const http = request(app.getHttpServer());

    const list = await http
      .get(`/auctions/manage/${A1}/donations?status=pending`)
      .set(auth);
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    expect(
      (
        await http
          .put(`/auctions/manage/donations/${D1}`)
          .set(auth)
          .send({ title: 'Better' })
      ).body.title,
    ).toBe('Better');
    const approve = await http
      .post(`/auctions/manage/donations/${D1}/approve`)
      .set(auth)
      .send({ starting_bid_cents: 1000, increment_cents: 100 });
    expect(approve.status).toBe(201);
    expect(approve.body.item).toMatchObject({
      title: 'Better',
      source_donation_id: D1,
      donor_recognition: false,
    });
    expect(
      (
        await http
          .post(`/auctions/manage/donations/${D1}/decline`)
          .set(auth)
          .send({})
      ).status,
    ).toBe(400);

    const auction = await http.get(`/auctions/manage/${A1}`).set(auth);
    expect(auction.status).toBe(200);
    expect(auction.body.items).toHaveLength(1);
    expect((await http.get('/auctions/manage').set(auth)).status).toBe(200);
  });

  it('requires authentication', async () => {
    await boot();
    const http = request(app.getHttpServer());
    expect((await http.get('/auctions/manage/organization')).status).toBe(401);
    expect(
      (await http.post(`/auctions/manage/donations/${D1}/approve`).send({}))
        .status,
    ).toBe(401);
  });
});
