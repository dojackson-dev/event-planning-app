import { BadRequestException, NotFoundException } from '@nestjs/common';
import { makeBiddingDb } from '../bidding/fake-supabase.testutil';
import type { Row } from '../bidding/fake-supabase.testutil';
import { AuctionAdminService } from './auction-admin.service';
import {
  AuctionDonationsAdminService,
  ORGANIZER_DONATION_COLUMNS,
} from './auction-donations-admin.service';

const A1 = '11111111-1111-4111-8111-111111111111';
const A2 = '22222222-2222-4222-8222-222222222222';
const D1 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1';
const D2 = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2';
const D_OTHER = 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3';
const IMG = 'https://img.test/a.webp';

function donation(over: Row = {}): Row {
  return {
    id: D1,
    auction_id: A1,
    donor_name: 'Pat Donor',
    donor_business: 'Pat Pizza',
    donor_email: 'pat@example.com',
    donor_phone: '+14155550123',
    title: 'Pizza party',
    description: 'Ten pizzas',
    category: 'Dining',
    estimated_value_cents: 25_000,
    image_urls: [IMG],
    condition: 'New',
    specifications: null,
    whats_included: 'Ten pizzas',
    restrictions: 'Dine-in',
    expires_on: '2027-01-01',
    fulfillment_method: 'pickup',
    fulfillment_details: 'Downtown',
    is_experience: false,
    scheduling_requirements: null,
    blackout_dates: null,
    recognition_ok: true,
    status: 'pending',
    item_id: null,
    ip_hash: 'hash',
    ...over,
  };
}

function setup(tables: Record<string, Row[]> = {}) {
  const db = makeBiddingDb({
    promoter_accounts: [
      {
        id: 'p1',
        user_id: 'user-1',
        company_name: 'A',
        is_nonprofit: true,
        nonprofit_status: 'verified',
      },
      {
        id: 'p2',
        user_id: 'user-2',
        company_name: 'B',
        is_nonprofit: true,
        nonprofit_status: 'verified',
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
      {
        id: A2,
        promoter_account_id: 'p2',
        status: 'draft',
        title: 'Theirs',
        starts_at: null,
        ends_at: null,
      },
    ],
    auction_donations: [
      donation(),
      donation({ id: D2, status: 'declined' }),
      donation({ id: D_OTHER, auction_id: A2 }),
    ],
    auction_items: [],
    auction_audit: [],
    ...tables,
  });
  const admin = new AuctionAdminService(db.asService());
  return {
    db,
    admin,
    svc: new AuctionDonationsAdminService(db.asService(), admin),
  };
}

const approveBody = { starting_bid_cents: 5_000, increment_cents: 500 };

describe('AuctionDonationsAdminService', () => {
  it('never selects the submitter IP hash', () => {
    expect(ORGANIZER_DONATION_COLUMNS).not.toContain('ip_hash');
    expect(ORGANIZER_DONATION_COLUMNS).toContain('donor_email');
  });

  describe('list', () => {
    it("lists the caller's auction donations, optionally by status", async () => {
      const { svc } = setup();
      expect((await svc.list('user-1', A1, undefined)) as Row[]).toHaveLength(
        2,
      );
      const pending = (await svc.list('user-1', A1, 'pending')) as Row[];
      expect(pending.map((d) => d.id)).toEqual([D1]);
    });

    it("rejects an unknown status and another promoter's auction", async () => {
      const { svc } = setup();
      await expect(svc.list('user-1', A1, 'maybe')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(svc.list('user-1', A2, undefined)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(svc.list('nobody', A1, undefined)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('edits content fields of a pending donation only', async () => {
      const { svc, db } = setup();
      const out = (await svc.update('user-1', D1, {
        title: 'Better title',
        estimated_value_cents: 30_000,
        restrictions: 'None',
        recognition_ok: false,
        status: 'approved',
        donor_phone: '+14155559999',
      })) as Row;
      expect(out).toMatchObject({
        title: 'Better title',
        estimated_value_cents: 30_000,
        restrictions: 'None',
      });
      const stored = db.table('auction_donations')[0];
      expect(stored).toMatchObject({
        status: 'pending',
        recognition_ok: true,
        donor_phone: '+14155550123',
      });
      await expect(
        svc.update('user-1', D2, { title: 'x' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('validates and is scoped to the caller', async () => {
      const { svc } = setup();
      await expect(
        svc.update('user-1', D1, { title: '' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        svc.update('user-1', D1, { fulfillment_method: 'teleport' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        svc.update('user-1', D_OTHER, { title: 'hijack' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('decline', () => {
    it('declines with a reason and records the reviewer', async () => {
      const { svc, db } = setup();
      const out = (await svc.decline('user-1', D1, {
        reason: 'Not a fit',
      })) as Row;
      expect(out).toMatchObject({
        status: 'declined',
        decline_reason: 'Not a fit',
      });
      expect(db.table('auction_donations')[0]).toMatchObject({
        status: 'declined',
        decline_reason: 'Not a fit',
        reviewed_by_user_id: 'user-1',
      });
      expect(db.table('auction_audit')[0]).toMatchObject({
        action: 'donation_declined',
        entity_id: D1,
      });
    });

    it('works without a reason, only once, and only on own auctions', async () => {
      const { svc } = setup();
      await expect(svc.decline('user-1', D1, {})).resolves.toMatchObject({
        status: 'declined',
      });
      await expect(svc.decline('user-1', D1, {})).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(svc.decline('user-1', D_OTHER, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(svc.decline('user-2', D1, {})).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('approve', () => {
    it('creates the auction item from the donation and links both ways', async () => {
      const { svc, db } = setup();
      const out = (await svc.approve('user-1', D1, {
        ...approveBody,
        reserve_cents: 8_000,
        buy_now_cents: 30_000,
        lot_number: 7,
      })) as { donation: Row; item: Row };

      expect(out.item).toMatchObject({
        auction_id: A1,
        sale_mode: 'auction',
        status: 'open',
        title: 'Pizza party',
        description: 'Ten pizzas',
        category: 'Dining',
        donor_name: 'Pat Donor',
        donor_business: 'Pat Pizza',
        donor_recognition: true,
        image_urls: [IMG],
        fair_market_value_cents: 25_000,
        starting_bid_cents: 5_000,
        increment_cents: 500,
        reserve_cents: 8_000,
        buy_now_cents: 30_000,
        lot_number: 7,
        condition: 'New',
        whats_included: 'Ten pizzas',
        restrictions: 'Dine-in',
        expires_on: '2027-01-01',
        fulfillment_method: 'pickup',
        fulfillment_details: 'Downtown',
        is_experience: false,
        source_donation_id: D1,
      });
      expect(out.donation).toMatchObject({
        status: 'approved',
        item_id: out.item.id,
      });
      expect(db.table('auction_donations')[0]).toMatchObject({
        status: 'approved',
        item_id: out.item.id,
        reviewed_by_user_id: 'user-1',
      });
      expect(db.table('auction_items')).toHaveLength(1);
      expect(db.table('auction_audit').map((a) => a.action)).toEqual(
        expect.arrayContaining(['donation_approved']),
      );
    });

    it("carries the donor's recognition choice onto the item", async () => {
      const { svc } = setup({
        auction_donations: [donation({ recognition_ok: false })],
      });
      const out = (await svc.approve('user-1', D1, approveBody)) as {
        item: Row;
      };
      expect(out.item.donor_recognition).toBe(false);
    });

    it('lets the organizer override the category', async () => {
      const { svc } = setup();
      const out = (await svc.approve('user-1', D1, {
        ...approveBody,
        category: 'Food',
      })) as { item: Row };
      expect(out.item.category).toBe('Food');
    });

    it('keeps all six donated photos', async () => {
      const six = Array.from(
        { length: 6 },
        (_v, i) => `https://img.test/${i}.webp`,
      );
      const { svc } = setup({
        auction_donations: [donation({ image_urls: six })],
      });
      const out = (await svc.approve('user-1', D1, approveBody)) as {
        item: Row;
      };
      expect(out.item.image_urls).toEqual(six);
    });

    it('cannot approve twice or approve a declined donation, so only one item exists', async () => {
      const { svc, db } = setup();
      await svc.approve('user-1', D1, approveBody);
      await expect(
        svc.approve('user-1', D1, approveBody),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        svc.approve('user-1', D2, approveBody),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.table('auction_items')).toHaveLength(1);
    });

    it('two concurrent approvals create a single item', async () => {
      const { svc, db } = setup();
      const results = await Promise.allSettled([
        svc.approve('user-1', D1, approveBody),
        svc.approve('user-1', D1, approveBody),
      ]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      expect(db.table('auction_items')).toHaveLength(1);
    });

    it("is scoped to the caller: another promoter's donation is 404 and untouched", async () => {
      const { svc, db } = setup();
      await expect(
        svc.approve('user-1', D_OTHER, approveBody),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        svc.approve('user-2', D1, approveBody),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.table('auction_items')).toHaveLength(0);
      expect(db.table('auction_donations').map((d) => d.status)).toEqual([
        'pending',
        'declined',
        'pending',
      ]);
    });

    it.each([
      ['no starting bid', {}],
      ['zero starting bid', { starting_bid_cents: 0 }],
      ['fractional bid', { starting_bid_cents: 10.5 }],
    ])('rejects %s without claiming the donation', async (_l, body) => {
      const { svc, db } = setup();
      await expect(svc.approve('user-1', D1, body)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(db.table('auction_donations')[0].status).toBe('pending');
    });

    it('releases the donation when the item cannot be created (reserve below start)', async () => {
      const { svc, db } = setup();
      await expect(
        svc.approve('user-1', D1, { ...approveBody, reserve_cents: 1_000 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.table('auction_donations')[0]).toMatchObject({
        status: 'pending',
        item_id: null,
      });
      expect(db.table('auction_items')).toHaveLength(0);
      // ...and it can still be approved properly afterwards.
      await expect(
        svc.approve('user-1', D1, approveBody),
      ).resolves.toBeDefined();
    });

    it('refuses on an auction whose items are locked (closed) and leaves the donation pending', async () => {
      const { svc, db } = setup({
        auctions: [
          {
            id: A1,
            promoter_account_id: 'p1',
            status: 'closed',
            title: 'Done',
            starts_at: null,
            ends_at: '2020-01-01T00:00:00Z',
          },
        ],
      });
      await expect(
        svc.approve('user-1', D1, approveBody),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(db.table('auction_donations')[0].status).toBe('pending');
      expect(db.table('auction_items')).toHaveLength(0);
    });
  });
});
