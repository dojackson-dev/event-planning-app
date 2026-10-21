import { NotFoundException } from '@nestjs/common';
import { AuctionOrgPublicService } from './auction-org-public.service';
import { AuctionPublicService } from './auction-public.service';
import {
  AUCTION_ID,
  liveAuctionRow,
  makeBiddingDb,
} from './fake-supabase.testutil';
import type { Row } from './fake-supabase.testutil';

const ORG_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ITEM_ID = '44444444-4444-4444-8444-444444444444';
const verified = { is_nonprofit: true, nonprofit_status: 'verified' };

function org(overrides: Row = {}): Row {
  return {
    id: ORG_ID,
    promoter_account_id: 'promoter-secret',
    slug: 'helping-hands',
    name: 'Helping Hands',
    tagline: 'We help',
    logo_url: null,
    cover_image_url: 'https://img.test/cover.webp',
    story: 'Our story',
    beneficiaries: 'Local kids',
    goal_cents: 5_000_000,
    impact_examples: [{ title: '$50', text: 'Feeds a family' }],
    website_url: 'https://hands.example',
    contact_email: 'hello@hands.example',
    ein: '12-3456789',
    social: {},
    is_published: true,
    promoter_accounts: verified,
    ...overrides,
  };
}

function auctionRow(overrides: Row = {}): Row {
  return liveAuctionRow({
    organization_id: ORG_ID,
    slug: 'spring-gala',
    cover_image_url: null,
    accepts_donations: false,
    donations_close_at: null,
    page_published: false,
    organization: { slug: 'helping-hands', is_published: true },
    ...overrides,
  });
}

function itemRow(overrides: Row = {}): Row {
  return {
    id: ITEM_ID,
    auction_id: AUCTION_ID,
    lot_number: 1,
    sale_mode: 'auction',
    title: 'Pizza party',
    description: null,
    category: null,
    donor_name: 'Pat Donor',
    donor_business: 'Pat Pizza',
    donor_recognition: true,
    image_urls: [],
    fair_market_value_cents: 10_000,
    sort_order: 0,
    starting_bid_cents: 2_000,
    reserve_cents: 5_000,
    increment_cents: null,
    buy_now_cents: null,
    buy_now_available: false,
    fixed_price_cents: null,
    quantity: 1,
    quantity_sold: 0,
    per_bidder_limit: null,
    status: 'open',
    current_price_cents: 0,
    leader_bidder_id: null,
    bid_count: 0,
    ends_at: null,
    final_price_cents: null,
    source_donation_id: 'secret-donation',
    donor_email: 'pat@example.com',
    donor_phone: '+14155550123',
    ...overrides,
  };
}

describe('AuctionOrgPublicService / public visibility', () => {
  function setup(tables: Record<string, Row[]> = {}) {
    const db = makeBiddingDb({
      auction_organizations: [org()],
      auction_org_gallery: [],
      auction_org_sponsors: [],
      auction_items: [],
      ...tables,
    });
    const svc = db.asService();
    const publicAuctions = new AuctionPublicService(svc);
    return {
      db,
      publicAuctions,
      pages: new AuctionOrgPublicService(svc, publicAuctions),
    };
  }

  describe('GET organizations/:slug', () => {
    it('serves a published organization without internal ids', async () => {
      const { pages } = setup({
        auctions: [auctionRow()],
        auction_org_gallery: [
          {
            id: 'g2',
            organization_id: ORG_ID,
            image_url: 'https://img.test/2.webp',
            caption: 'two',
            sort_order: 2,
          },
          {
            id: 'g1',
            organization_id: ORG_ID,
            image_url: 'https://img.test/1.webp',
            caption: 'one',
            sort_order: 1,
          },
          {
            id: 'other',
            organization_id: 'x',
            image_url: 'https://img.test/x.webp',
            caption: null,
            sort_order: 0,
          },
        ],
      });
      const res = await pages.getOrganization('helping-hands');
      expect(res.organization).toMatchObject({
        id: ORG_ID,
        slug: 'helping-hands',
        name: 'Helping Hands',
        goal_cents: 5_000_000,
      });
      expect(res.organization).not.toHaveProperty('promoter_account_id');
      expect(res.organization).not.toHaveProperty('is_published');
      expect(res.gallery.map((g) => g.id)).toEqual(['g1', 'g2']);
      expect(JSON.stringify(res)).not.toContain('promoter-secret');
    });

    it('is 404 when the organization is not published', async () => {
      const { pages } = setup({
        auction_organizations: [org({ is_published: false })],
      });
      await expect(
        pages.getOrganization('helping-hands'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('is 404 when the promoter is not a verified non-profit', async () => {
      const { pages } = setup({
        auction_organizations: [
          org({
            promoter_accounts: {
              is_nonprofit: true,
              nonprofit_status: 'pending',
            },
          }),
        ],
      });
      await expect(
        pages.getOrganization('helping-hands'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
      'nope-nope',
      'Bad Slug',
      'register',
      'ab',
      '11111111-1111-4111-8111-111111111111',
    ])('is 404 for unknown or invalid slug %s', async (slug) => {
      const { pages } = setup();
      await expect(pages.getOrganization(slug)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns only sponsors with permission_confirmed', async () => {
      const { pages } = setup({
        auction_org_sponsors: [
          {
            id: 's1',
            organization_id: ORG_ID,
            name: 'Yes Inc',
            logo_url: null,
            website_url: null,
            tier: 'Gold',
            sort_order: 1,
            permission_confirmed: true,
          },
          {
            id: 's2',
            organization_id: ORG_ID,
            name: 'No Inc',
            logo_url: null,
            website_url: null,
            tier: 'Gold',
            sort_order: 0,
            permission_confirmed: false,
          },
        ],
      });
      const res = await pages.getOrganization('helping-hands');
      expect(res.sponsors).toEqual([
        {
          id: 's1',
          name: 'Yes Inc',
          logo_url: null,
          website_url: null,
          tier: 'Gold',
        },
      ]);
      expect(JSON.stringify(res)).not.toContain('No Inc');
      expect(JSON.stringify(res)).not.toContain('permission_confirmed');
    });

    it('lists only publicly visible auctions as cards, with phases', async () => {
      const t = (h: number) =>
        new Date(Date.now() + h * 3_600_000).toISOString();
      const { pages } = setup({
        auctions: [
          auctionRow({
            id: 'a-live',
            slug: 'live-one',
            status: 'live',
            title: 'Live',
          }),
          auctionRow({
            id: 'a-draft-hidden',
            slug: 'hidden',
            status: 'draft',
            title: 'Hidden draft',
            starts_at: null,
            ends_at: null,
          }),
          auctionRow({
            id: 'a-draft-page',
            slug: 'donate-now',
            status: 'draft',
            page_published: true,
            accepts_donations: true,
            title: 'Donate',
            starts_at: null,
            ends_at: null,
          }),
          auctionRow({
            id: 'a-cancelled',
            slug: 'cancelled',
            status: 'cancelled',
            page_published: true,
            title: 'Cancelled',
          }),
          auctionRow({
            id: 'a-closed',
            slug: 'old-one',
            status: 'closed',
            title: 'Closed',
            starts_at: t(-48),
            ends_at: t(-24),
          }),
          auctionRow({
            id: 'other-org',
            organization_id: 'someone-else',
            slug: 'nope',
            title: 'Other',
          }),
        ],
        auction_items: [
          itemRow({
            id: 'i1',
            auction_id: 'a-live',
            status: 'open',
            bid_count: 2,
            current_price_cents: 7_000,
          }),
          itemRow({
            id: 'i2',
            auction_id: 'a-live',
            status: 'open',
            bid_count: 0,
          }),
          itemRow({ id: 'i3', auction_id: 'a-live', status: 'withdrawn' }),
          itemRow({
            id: 'i4',
            auction_id: 'a-closed',
            status: 'sold',
            final_price_cents: 9_000,
            current_price_cents: 9_000,
            bid_count: 3,
          }),
          itemRow({ id: 'i5', auction_id: 'a-draft-page' }),
        ],
      });
      const { auctions } = await pages.getOrganization('helping-hands');
      expect(auctions.map((a) => a.id)).toEqual([
        'a-live',
        'a-draft-page',
        'a-closed',
      ]);
      expect(auctions[0]).toMatchObject({
        slug: 'live-one',
        phase: 'bidding_open',
        item_count: 2,
        bid_total_cents: 7_000,
      });
      expect(auctions[1]).toMatchObject({
        slug: 'donate-now',
        phase: 'accepting_donations',
        item_count: 1,
      });
      expect(auctions[1]).not.toHaveProperty('bid_total_cents');
      expect(auctions[2]).toMatchObject({
        phase: 'closed',
        bid_total_cents: 9_000,
      });
    });
  });

  describe('GET resolve/:orgSlug/:auctionSlug', () => {
    it('maps slugs to ids for a visible auction', async () => {
      const { pages } = setup({ auctions: [auctionRow()] });
      await expect(
        pages.resolve('helping-hands', 'spring-gala'),
      ).resolves.toEqual({
        auctionId: AUCTION_ID,
        organizationId: ORG_ID,
      });
    });

    it('resolves a draft only once its page is published', async () => {
      const draft = { status: 'draft', starts_at: null, ends_at: null };
      const hidden = setup({ auctions: [auctionRow(draft)] });
      await expect(
        hidden.pages.resolve('helping-hands', 'spring-gala'),
      ).rejects.toBeInstanceOf(NotFoundException);
      const shown = setup({
        auctions: [auctionRow({ ...draft, page_published: true })],
      });
      await expect(
        shown.pages.resolve('helping-hands', 'spring-gala'),
      ).resolves.toMatchObject({ auctionId: AUCTION_ID });
    });

    it('is 404 for a cancelled auction, an unknown slug, an unpublished org or the wrong org', async () => {
      const cancelled = setup({
        auctions: [auctionRow({ status: 'cancelled', page_published: true })],
      });
      await expect(
        cancelled.pages.resolve('helping-hands', 'spring-gala'),
      ).rejects.toBeInstanceOf(NotFoundException);

      const { pages } = setup({ auctions: [auctionRow()] });
      await expect(
        pages.resolve('helping-hands', 'other-slug'),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        pages.resolve('someone-else', 'spring-gala'),
      ).rejects.toBeInstanceOf(NotFoundException);

      const unpublished = setup({
        auction_organizations: [org({ is_published: false })],
        auctions: [auctionRow()],
      });
      await expect(
        unpublished.pages.resolve('helping-hands', 'spring-gala'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('GET :auctionId/story', () => {
    it('returns the organization story, gallery, sponsors and phase', async () => {
      const { pages } = setup({
        auctions: [
          auctionRow({
            status: 'draft',
            starts_at: null,
            ends_at: null,
            page_published: true,
            accepts_donations: true,
          }),
        ],
        auction_org_gallery: [
          {
            id: 'g1',
            organization_id: ORG_ID,
            image_url: 'https://img.test/1.webp',
            caption: null,
            sort_order: 0,
          },
        ],
        auction_org_sponsors: [
          {
            id: 's1',
            organization_id: ORG_ID,
            name: 'Yes',
            logo_url: null,
            website_url: null,
            tier: null,
            sort_order: 0,
            permission_confirmed: true,
          },
        ],
      });
      const story = await pages.getStory(AUCTION_ID);
      expect(story.organization).toMatchObject({
        slug: 'helping-hands',
        name: 'Helping Hands',
      });
      expect(story.gallery).toHaveLength(1);
      expect(story.sponsors).toHaveLength(1);
      expect(story.goal_cents).toBe(5_000_000);
      expect(story.auction).toMatchObject({
        id: AUCTION_ID,
        slug: 'spring-gala',
        phase: 'accepting_donations',
        status: 'draft',
        accepts_donations: true,
        org_slug: 'helping-hands',
      });
      expect(story).not.toHaveProperty('raised_cents');
    });

    it('works for a legacy auction with no organization', async () => {
      const { pages } = setup({
        auctions: [liveAuctionRow()],
        auction_items: [itemRow({ bid_count: 1, current_price_cents: 4_000 })],
      });
      const story = await pages.getStory(AUCTION_ID);
      expect(story.organization).toBeNull();
      expect(story.gallery).toEqual([]);
      expect(story.sponsors).toEqual([]);
      expect(story.goal_cents).toBeNull();
      expect(story.auction).toMatchObject({
        phase: 'bidding_open',
        org_slug: null,
      });
      expect(story.raised_cents).toBe(4_000);
    });

    it('hides the organization story while the organization is unpublished', async () => {
      const { pages } = setup({
        auction_organizations: [org({ is_published: false })],
        auctions: [
          auctionRow({
            organization: { slug: 'helping-hands', is_published: false },
          }),
        ],
      });
      const story = await pages.getStory(AUCTION_ID);
      expect(story.organization).toBeNull();
      expect(story.auction.org_slug).toBeNull();
      expect(JSON.stringify(story)).not.toContain('Our story');
    });

    it('reports raised_cents for a closed auction', async () => {
      const { pages } = setup({
        auctions: [auctionRow({ status: 'closed' })],
        auction_items: [
          itemRow({
            id: 'a',
            status: 'sold',
            final_price_cents: 6_000,
            current_price_cents: 6_000,
          }),
          itemRow({ id: 'b', status: 'unsold' }),
        ],
      });
      const story = await pages.getStory(AUCTION_ID);
      expect(story.auction.phase).toBe('closed');
      expect(story.raised_cents).toBe(6_000);
    });

    it('is 404 for an auction that is not public', async () => {
      const { pages } = setup({ auctions: [auctionRow({ status: 'draft' })] });
      await expect(pages.getStory(AUCTION_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('auction and item views', () => {
    it('shows a draft auction and its items only when the page is published', async () => {
      const draft = { status: 'draft', starts_at: null, ends_at: null };
      const hidden = setup({
        auctions: [auctionRow(draft)],
        auction_items: [itemRow()],
      });
      await expect(
        hidden.publicAuctions.getAuction(AUCTION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        hidden.publicAuctions.getItem(ITEM_ID),
      ).rejects.toBeInstanceOf(NotFoundException);

      const shown = setup({
        auctions: [auctionRow({ ...draft, page_published: true })],
        auction_items: [itemRow()],
      });
      const res = await shown.publicAuctions.getAuction(AUCTION_ID);
      expect(res.auction).toMatchObject({
        phase: 'preview',
        slug: 'spring-gala',
        org_slug: 'helping-hands',
      });
      expect(res.items).toHaveLength(1);
      // Draft items show a bid floor but cannot be bid on (enforced by the database functions; see the regression spec).
      expect(res.items[0].min_next_bid_cents).toBe(2_000);
      expect((await shown.publicAuctions.getItem(ITEM_ID)).item.id).toBe(
        ITEM_ID,
      );
    });

    it('never shows a cancelled auction, even with its page flag on', async () => {
      const { publicAuctions } = setup({
        auctions: [auctionRow({ status: 'cancelled', page_published: true })],
        auction_items: [itemRow()],
      });
      await expect(
        publicAuctions.getAuction(AUCTION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('includes the new item fields but no donor contact details or donation link', async () => {
      const { publicAuctions } = setup({
        auctions: [auctionRow()],
        auction_items: [
          itemRow({
            condition: 'New',
            specifications: 'Large',
            whats_included: '10 pizzas',
            restrictions: 'Dine-in only',
            expires_on: '2027-01-01',
            fulfillment_method: 'pickup',
            fulfillment_details: 'Downtown',
            is_experience: true,
            scheduling_requirements: 'Book 2 weeks ahead',
            blackout_dates: 'Holidays',
          }),
        ],
      });
      const { items } = await publicAuctions.getAuction(AUCTION_ID);
      expect(items[0]).toMatchObject({
        condition: 'New',
        specifications: 'Large',
        whats_included: '10 pizzas',
        restrictions: 'Dine-in only',
        expires_on: '2027-01-01',
        fulfillment_method: 'pickup',
        fulfillment_details: 'Downtown',
        is_experience: true,
        scheduling_requirements: 'Book 2 weeks ahead',
        blackout_dates: 'Holidays',
      });
      const text = JSON.stringify(items);
      expect(text).not.toContain('pat@example.com');
      expect(text).not.toContain('4155550123');
      expect(text).not.toContain('secret-donation');
      expect(text).not.toContain('source_donation_id');
      expect(text).not.toContain('reserve_cents');
    });

    it('shows donor name and business only when the donor agreed to recognition', async () => {
      const { publicAuctions } = setup({
        auctions: [auctionRow()],
        auction_items: [
          itemRow({ id: 'yes', donor_recognition: true }),
          itemRow({ id: 'no', donor_recognition: false }),
        ],
      });
      const { items } = await publicAuctions.getAuction(AUCTION_ID);
      const byId = Object.fromEntries(items.map((i) => [i.id, i]));
      expect(byId.yes).toMatchObject({
        donor_name: 'Pat Donor',
        donor_business: 'Pat Pizza',
      });
      expect(byId.no.donor_name).toBeNull();
      expect(byId.no.donor_business).toBeNull();

      const detail = await publicAuctions.getItem('no');
      expect(JSON.stringify(detail)).not.toContain('Pat Donor');
      expect(JSON.stringify(detail)).not.toContain('Pat Pizza');
      const state = await publicAuctions.getState(AUCTION_ID, null);
      expect(JSON.stringify(state)).not.toContain('Pat');
    });

    it('requires an open (scheduled/live) auction for registration even when a draft page is public', async () => {
      const { publicAuctions } = setup({
        auctions: [
          auctionRow({
            status: 'draft',
            starts_at: null,
            ends_at: null,
            page_published: true,
          }),
        ],
      });
      await expect(
        publicAuctions.requireRegistrableAuction(AUCTION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('before the organization-pages migration is applied', () => {
    it('falls back to the original columns and keeps existing attribution', async () => {
      const db = makeBiddingDb({
        auctions: [liveAuctionRow()],
        auction_items: [itemRow()],
      });
      const real = db.from;
      const gap = {
        data: null,
        error: { code: '42703', message: 'column does not exist' },
      };
      // Any select naming a migration column fails like PostgREST would before the migration.
      const failing = (): unknown =>
        new Proxy(
          {},
          {
            get: (_t, prop) =>
              prop === 'then'
                ? (resolve: (v: unknown) => unknown) => resolve(gap)
                : prop === 'maybeSingle'
                  ? () => Promise.resolve(gap)
                  : () => failing(),
          },
        );
      db.from = ((name: string) => {
        const query = real(name);
        return new Proxy(query, {
          get(target, prop) {
            if (prop === 'select') {
              return (cols: string, opts?: unknown) =>
                /organization|donor_recognition/.test(cols)
                  ? failing()
                  : (target as any).select(cols, opts);
            }
            return (target as any)[prop].bind(target);
          },
        });
      }) as never;
      const svc = new AuctionPublicService(db.asService());
      const res = await svc.getAuction(AUCTION_ID);
      expect(res.auction.status).toBe('live');
      expect(res.items[0].donor_name).toBe('Pat Donor');
    });
  });
});
