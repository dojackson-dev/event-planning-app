import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FakeDb, makeBiddingDb } from '../bidding/fake-supabase.testutil';
import type { Row } from '../bidding/fake-supabase.testutil';
import { AuctionAdminService } from './auction-admin.service';
import { AuctionOrgService } from './auction-org.service';

const P1 = 'promoter-1';
const P2 = 'promoter-2';
const ORG1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const ORG2 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2';
const IMG = 'https://img.test/a.webp';

const promoters = (): Row[] => [
  {
    id: P1,
    user_id: 'user-1',
    company_name: 'Acme Events',
    is_nonprofit: true,
    nonprofit_status: 'verified',
    nonprofit_legal_name: 'Helping Hands',
    nonprofit_ein: '12-3456789',
  },
  {
    id: P2,
    user_id: 'user-2',
    company_name: 'Other',
    is_nonprofit: true,
    nonprofit_status: 'verified',
  },
];

const orgRow = (over: Row = {}): Row => ({
  id: ORG1,
  promoter_account_id: P1,
  slug: 'helping-hands',
  name: 'Helping Hands',
  is_published: false,
  ...over,
});

function setup(tables: Record<string, Row[]> = {}) {
  const db: FakeDb = makeBiddingDb({
    auctions: [],
    promoter_accounts: promoters(),
    auction_organizations: [],
    auction_org_gallery: [],
    auction_org_sponsors: [],
    ...tables,
  });
  const admin = new AuctionAdminService(db.asService());
  return { db, admin, org: new AuctionOrgService(db.asService(), admin) };
}

const reject = async (p: Promise<unknown>) =>
  p.then(
    () => {
      throw new Error('expected a rejection');
    },
    (e: unknown) => e,
  );

describe('AuctionOrgService', () => {
  describe('organization', () => {
    it('returns null before an organization exists', async () => {
      const { org } = setup();
      await expect(org.getMine('user-1')).resolves.toBeNull();
    });

    it('404s for a user without a promoter account', async () => {
      const { org } = setup();
      await expect(org.getMine('nobody')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('creates the organization for the caller, forcing ownership and prefilling the EIN', async () => {
      const { org, db } = setup();
      const created = await org.upsert('user-1', {
        slug: 'Helping-Hands',
        name: ' Helping Hands ',
        promoter_account_id: P2,
        story: 'We help',
        goal_cents: 100_000,
        social: {
          instagram: 'https://instagram.com/hh',
          tiktok: 'https://t.co/x',
        },
      });
      expect(created).toMatchObject({
        slug: 'helping-hands',
        name: 'Helping Hands',
        promoter_account_id: P1,
        ein: '12-3456789',
        story: 'We help',
        gallery: [],
        sponsors: [],
        social: { instagram: 'https://instagram.com/hh' },
      });
      expect(db.table('auction_organizations')).toHaveLength(1);
    });

    it.each([
      ['no slug', { name: 'X' }],
      ['no name', { slug: 'abc' }],
      ['reserved slug', { slug: 'register', name: 'X' }],
      ['bad slug', { slug: 'a--b', name: 'X' }],
      [
        'uuid slug',
        { slug: '11111111-1111-4111-8111-111111111111', name: 'X' },
      ],
      ['story too long', { slug: 'abc', name: 'X', story: 'x'.repeat(10_001) }],
      [
        'non-https logo',
        { slug: 'abc', name: 'X', logo_url: 'http://x.test/a.png' },
      ],
      [
        'javascript website',
        { slug: 'abc', name: 'X', website_url: 'javascript:alert(1)' },
      ],
      ['bad email', { slug: 'abc', name: 'X', contact_email: 'nope' }],
      ['negative goal', { slug: 'abc', name: 'X', goal_cents: -1 }],
      [
        'published not boolean',
        { slug: 'abc', name: 'X', is_published: 'yes' },
      ],
    ])('rejects %s', async (_label, body) => {
      const { org } = setup();
      await expect(org.upsert('user-1', body)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('rejects a slug another organization already uses', async () => {
      const { org } = setup({
        auction_organizations: [
          orgRow({ id: ORG2, promoter_account_id: P2, slug: 'taken-slug' }),
        ],
      });
      await expect(
        org.upsert('user-1', { slug: 'taken-slug', name: 'X' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it("updates only the caller's organization, keeping other fields", async () => {
      const { org, db } = setup({
        auction_organizations: [
          orgRow({ story: 'old' }),
          orgRow({
            id: ORG2,
            promoter_account_id: P2,
            slug: 'other-org',
            name: 'Other',
            story: 'theirs',
          }),
        ],
      });
      const updated = await org.upsert('user-1', {
        is_published: true,
        tagline: 'Hi',
      });
      expect(updated).toMatchObject({
        id: ORG1,
        is_published: true,
        tagline: 'Hi',
        story: 'old',
        slug: 'helping-hands',
      });
      const other = db
        .table('auction_organizations')
        .find((o) => o.id === ORG2)!;
      expect(other).toMatchObject({ story: 'theirs', is_published: false });
      expect(other.tagline).toBeUndefined();
    });

    it('lets the owner keep or change to a free slug but not a taken one', async () => {
      const { org } = setup({
        auction_organizations: [
          orgRow(),
          orgRow({ id: ORG2, promoter_account_id: P2, slug: 'other-org' }),
        ],
      });
      await expect(
        org.upsert('user-1', { slug: 'helping-hands' }),
      ).resolves.toMatchObject({ slug: 'helping-hands' });
      await expect(
        org.upsert('user-1', { slug: 'brand-new' }),
      ).resolves.toMatchObject({ slug: 'brand-new' });
      await expect(
        org.upsert('user-1', { slug: 'other-org' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('returns the organization with its gallery and all sponsors (including unconfirmed) to its owner', async () => {
      const { org } = setup({
        auction_organizations: [orgRow()],
        auction_org_gallery: [
          { id: 'g1', organization_id: ORG1, image_url: IMG, sort_order: 0 },
        ],
        auction_org_sponsors: [
          {
            id: 's1',
            organization_id: ORG1,
            name: 'A',
            sort_order: 0,
            permission_confirmed: false,
          },
          {
            id: 's2',
            organization_id: ORG2,
            name: 'Not mine',
            sort_order: 0,
            permission_confirmed: true,
          },
        ],
      });
      const mine = (await org.getMine('user-1'))!;
      expect(mine.gallery).toHaveLength(1);
      expect(mine.sponsors.map((s) => s.id)).toEqual(['s1']);
    });
  });

  describe('slug availability', () => {
    it('explains why a slug is unusable', async () => {
      const { org } = setup({
        auction_organizations: [
          orgRow(),
          orgRow({ id: ORG2, promoter_account_id: P2, slug: 'other-org' }),
        ],
      });
      await expect(org.slugAvailable('user-1', 'fresh-slug')).resolves.toEqual({
        available: true,
      });
      await expect(
        org.slugAvailable('user-1', 'helping-hands'),
      ).resolves.toEqual({ available: true });
      await expect(
        org.slugAvailable('user-1', 'other-org'),
      ).resolves.toMatchObject({
        available: false,
        reason: expect.stringMatching(/taken/i),
      });
      await expect(
        org.slugAvailable('user-1', 'register'),
      ).resolves.toMatchObject({
        available: false,
        reason: expect.stringMatching(/reserved/i),
      });
      await expect(org.slugAvailable('user-1', 'A_B')).resolves.toMatchObject({
        available: false,
      });
      await expect(
        org.slugAvailable('user-1', undefined),
      ).resolves.toMatchObject({ available: false });
    });

    it("treats a new caller's own taken slug as taken", async () => {
      const { org } = setup({
        auction_organizations: [
          orgRow({ id: ORG2, promoter_account_id: P2, slug: 'other-org' }),
        ],
      });
      await expect(
        org.slugAvailable('user-1', 'other-org'),
      ).resolves.toMatchObject({ available: false });
    });
  });

  describe('gallery', () => {
    it('adds images at the end, edits, reorders and deletes', async () => {
      const { org } = setup({ auction_organizations: [orgRow()] });
      const a = (await org.addGalleryImage('user-1', {
        image_url: IMG,
        caption: 'A',
      })) as Row;
      const b = (await org.addGalleryImage('user-1', {
        image_url: IMG,
      })) as Row;
      const c = (await org.addGalleryImage('user-1', {
        image_url: IMG,
      })) as Row;
      expect([a.sort_order, b.sort_order, c.sort_order]).toEqual([0, 1, 2]);

      await expect(
        org.updateGalleryImage('user-1', b.id, { caption: 'B' }),
      ).resolves.toMatchObject({ caption: 'B' });
      const reordered = await org.reorderGallery('user-1', {
        ids: [c.id, a.id],
      });
      expect(reordered.map((r) => r.id)).toEqual([c.id, a.id, b.id]);
      await expect(org.deleteGalleryImage('user-1', a.id)).resolves.toEqual({
        ok: true,
      });
      expect((await org.getMine('user-1'))!.gallery.map((g) => g.id)).toEqual([
        c.id,
        b.id,
      ]);
    });

    it('validates input and caps the count', async () => {
      const { org } = setup({ auction_organizations: [orgRow()] });
      await expect(
        org.addGalleryImage('user-1', { image_url: 'http://x.test/a.png' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(org.addGalleryImage('user-1', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        org.addGalleryImage('user-1', {
          image_url: IMG,
          caption: 'x'.repeat(301),
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        org.reorderGallery('user-1', { ids: ['x'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires an organization', async () => {
      const { org } = setup();
      await expect(
        org.addGalleryImage('user-1', { image_url: IMG }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("cannot touch another promoter's gallery", async () => {
      const foreign = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const { org, db } = setup({
        auction_organizations: [
          orgRow(),
          orgRow({ id: ORG2, promoter_account_id: P2, slug: 'other-org' }),
        ],
        auction_org_gallery: [
          {
            id: foreign,
            organization_id: ORG2,
            image_url: IMG,
            caption: 'theirs',
            sort_order: 0,
          },
        ],
      });
      await expect(
        org.updateGalleryImage('user-1', foreign, { caption: 'mine now' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        org.deleteGalleryImage('user-1', foreign),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        org.reorderGallery('user-1', { ids: [foreign] }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.table('auction_org_gallery')[0].caption).toBe('theirs');
    });
  });

  describe('sponsors', () => {
    it('defaults permission_confirmed to false and edits it explicitly', async () => {
      const { org } = setup({ auction_organizations: [orgRow()] });
      const s = (await org.addSponsor('user-1', {
        name: 'Acme',
        tier: 'Gold',
        website_url: 'https://acme.test',
      })) as Row;
      expect(s).toMatchObject({
        name: 'Acme',
        tier: 'Gold',
        permission_confirmed: false,
        organization_id: ORG1,
      });
      await expect(
        org.updateSponsor('user-1', s.id, { permission_confirmed: true }),
      ).resolves.toMatchObject({ permission_confirmed: true });
      await expect(
        org.addSponsor('user-1', { name: 'B', permission_confirmed: true }),
      ).resolves.toMatchObject({ permission_confirmed: true, sort_order: 1 });
    });

    it('validates fields', async () => {
      const { org } = setup({ auction_organizations: [orgRow()] });
      await expect(org.addSponsor('user-1', {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(
        org.addSponsor('user-1', { name: 'A', website_url: 'ftp://x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        org.addSponsor('user-1', { name: 'A', permission_confirmed: 'yes' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        org.addSponsor('user-1', { name: 'A', tier: 'x'.repeat(61) }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("reorders, deletes, and refuses another promoter's sponsors", async () => {
      const foreign = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const { org } = setup({
        auction_organizations: [
          orgRow(),
          orgRow({ id: ORG2, promoter_account_id: P2, slug: 'other-org' }),
        ],
        auction_org_sponsors: [
          {
            id: foreign,
            organization_id: ORG2,
            name: 'Theirs',
            sort_order: 0,
            permission_confirmed: true,
          },
        ],
      });
      const a = (await org.addSponsor('user-1', { name: 'A' })) as Row;
      const b = (await org.addSponsor('user-1', { name: 'B' })) as Row;
      expect(
        (await org.reorderSponsors('user-1', { ids: [b.id, a.id] })).map(
          (r) => r.id,
        ),
      ).toEqual([b.id, a.id]);
      await expect(org.deleteSponsor('user-1', a.id)).resolves.toEqual({
        ok: true,
      });
      await expect(
        org.updateSponsor('user-1', foreign, { name: 'Mine' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(org.deleteSponsor('user-1', foreign)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(
        org.reorderSponsors('user-1', { ids: [foreign] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe('auction page fields (AuctionAdminService)', () => {
  const future = (h: number) =>
    new Date(Date.now() + h * 3_600_000).toISOString();

  it("assigns the caller's organization on create and ignores a client-sent organization_id", async () => {
    const { admin, db } = setup({ auction_organizations: [orgRow()] });
    const created = await admin.createAuction('user-1', {
      title: 'Gala',
      slug: 'Spring-Gala',
      cover_image_url: IMG,
      accepts_donations: true,
      donations_close_at: future(24),
      page_published: true,
      organization_id: ORG2,
    });
    expect(created).toMatchObject({
      organization_id: ORG1,
      slug: 'spring-gala',
      cover_image_url: IMG,
      accepts_donations: true,
      page_published: true,
    });
    expect(db.table('auctions')[0].organization_id).toBe(ORG1);
  });

  it('still creates plain auctions when no organization exists', async () => {
    const { admin } = setup();
    const created = await admin.createAuction('user-1', { title: 'Gala' });
    expect(created.organization_id ?? null).toBeNull();
  });

  it('needs an organization for a slug or a published page, and a slug to publish', async () => {
    const none = setup();
    await expect(
      none.admin.createAuction('user-1', { title: 'G', slug: 'gala-one' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      none.admin.createAuction('user-1', { title: 'G', page_published: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const withOrg = setup({ auction_organizations: [orgRow()] });
    await expect(
      withOrg.admin.createAuction('user-1', {
        title: 'G',
        page_published: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    ['register'],
    ['a--b'],
    ['ab'],
    ['has space'],
    ['11111111-1111-4111-8111-111111111111'],
  ])('rejects invalid auction slug %s', async (slug) => {
    const { admin } = setup({ auction_organizations: [orgRow()] });
    await expect(
      admin.createAuction('user-1', { title: 'G', slug }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps slugs unique within an organization but not across organizations', async () => {
    const { admin } = setup({
      auction_organizations: [
        orgRow(),
        orgRow({ id: ORG2, promoter_account_id: P2, slug: 'other-org' }),
      ],
      auctions: [
        {
          id: 'a-other',
          promoter_account_id: P2,
          organization_id: ORG2,
          slug: 'spring-gala',
          status: 'draft',
        },
      ],
    });
    await expect(
      admin.createAuction('user-1', { title: 'G', slug: 'spring-gala' }),
    ).resolves.toMatchObject({ slug: 'spring-gala' });
    await expect(
      admin.createAuction('user-1', { title: 'H', slug: 'spring-gala' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("updates page fields and attaches a legacy auction to the caller's organization", async () => {
    const { admin, db } = setup({
      auction_organizations: [orgRow()],
      auctions: [
        {
          id: 'legacy',
          promoter_account_id: P1,
          organization_id: null,
          slug: null,
          status: 'draft',
          title: 'Old',
          starts_at: null,
          ends_at: null,
        },
      ],
    });
    const updated = await admin.updateAuction('user-1', 'legacy', {
      slug: 'old-gala',
      page_published: true,
      accepts_donations: true,
    });
    expect(updated).toMatchObject({
      organization_id: ORG1,
      slug: 'old-gala',
      page_published: true,
      accepts_donations: true,
    });
    expect(db.table('auctions')[0].organization_id).toBe(ORG1);
    // Re-saving its own slug is not a clash.
    await expect(
      admin.updateAuction('user-1', 'legacy', { slug: 'old-gala' }),
    ).resolves.toBeDefined();
  });

  it("cannot publish an existing auction's page without a slug, and cannot edit another promoter's auction", async () => {
    const { admin } = setup({
      auction_organizations: [orgRow()],
      auctions: [
        {
          id: 'noslug',
          promoter_account_id: P1,
          organization_id: ORG1,
          slug: null,
          status: 'draft',
          title: 'A',
          starts_at: null,
          ends_at: null,
        },
        {
          id: 'theirs',
          promoter_account_id: P2,
          organization_id: ORG2,
          slug: 'x-slug',
          status: 'draft',
          title: 'B',
          starts_at: null,
          ends_at: null,
        },
      ],
    });
    await expect(
      admin.updateAuction('user-1', 'noslug', { page_published: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      admin.updateAuction('user-1', 'theirs', { page_published: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('accepts the new item fields and rejects bad values', async () => {
    const { admin, db } = setup({
      auctions: [
        {
          id: 'a1',
          promoter_account_id: P1,
          status: 'draft',
          title: 'A',
          starts_at: null,
          ends_at: null,
        },
      ],
    });
    const item = await admin.createItem('user-1', 'a1', {
      title: 'Pizza',
      fair_market_value_cents: 5_000,
      starting_bid_cents: 1_000,
      condition: 'New',
      specifications: 'Large',
      whats_included: 'Ten pizzas',
      restrictions: 'Dine-in',
      expires_on: '2027-02-28',
      fulfillment_method: 'arranged_with_donor',
      fulfillment_details: 'Call ahead',
      is_experience: true,
      scheduling_requirements: '2 weeks',
      blackout_dates: 'Holidays',
      donor_name: 'Pat',
      donor_business: 'Pat Pizza',
      donor_recognition: false,
      source_donation_id: 'forged',
    });
    expect(item).toMatchObject({
      condition: 'New',
      fulfillment_method: 'arranged_with_donor',
      is_experience: true,
      donor_business: 'Pat Pizza',
      donor_recognition: false,
    });
    // Clients cannot link an item to a donation themselves.
    expect(db.table('auction_items')[0].source_donation_id ?? null).toBeNull();

    const base = {
      title: 'X',
      fair_market_value_cents: 0,
      starting_bid_cents: 1_000,
    };
    for (const bad of [
      { fulfillment_method: 'teleport' },
      { expires_on: '2027-02-30' },
      { expires_on: 'soon' },
      { is_experience: 'yes' },
      { condition: 'x'.repeat(201) },
      { donor_recognition: 1 },
    ]) {
      await expect(
        admin.createItem('user-1', 'a1', { ...base, ...bad }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(
      await reject(
        admin.createItem('user-1', 'a1', { ...base, title: 'bad\u0000' }),
      ),
    ).toBeInstanceOf(BadRequestException);
  });
});
