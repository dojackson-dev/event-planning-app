import {
  AuctionNotificationsService,
  OUTBOX_MAX_ATTEMPTS,
  outboxBackoffSeconds,
} from './auction-notifications.service';
import { FakeDb } from './fake-db';

const FUTURE = new Date(Date.now() + 48 * 3600_000).toISOString();

const BIDDER = {
  id: 'bidder-1',
  display_name: 'Sam Winner',
  email: 'sam@example.com',
  phone_e164: '+15555550100',
  phone_verified_at: '2026-01-01T00:00:00Z',
  sms_consent: true,
};

const ORDER = {
  id: 'order-1',
  auction_id: 'auction-1',
  promoter_account_id: 'promoter-1',
  bidder_id: 'bidder-1',
  status: 'failed',
  buyer_name: 'Sam Winner',
  buyer_email: 'sam@example.com',
  auction_title: 'Gala Auction',
  event_title: 'Gala',
  org_name: 'Helping Hands',
  org_ein: '123456789',
  subtotal_cents: 10_000,
  tax_cents: 0,
  platform_fee_cents: 150,
  processing_fee_cents: 350,
  total_cents: 10_500,
  pay_by_at: FUTURE,
  last_error_code: 'card_declined',
};

function row(over: Record<string, unknown> = {}) {
  return {
    id: 1,
    auction_id: 'auction-1',
    item_id: 'item-1',
    order_id: null,
    bidder_id: 'bidder-1',
    kind: 'outbid',
    payload: { item_title: 'Signed guitar', price_cents: 12_000 },
    status: 'processing',
    attempts: 1,
    ...over,
  };
}

function setup(
  rows: unknown[],
  opts: {
    bidder?: Record<string, unknown>;
    order?: Record<string, unknown>;
  } = {},
) {
  const db = new FakeDb();
  db.onRpc('claim_auction_outbox', { data: rows });
  db.on('auction_outbox.update', { data: [{ id: 1 }] });
  const bidder = { ...BIDDER, ...opts.bidder };
  const order = { ...ORDER, ...opts.order };
  const mail = {
    sendOutbid: jest.fn().mockResolvedValue('sent'),
    sendWon: jest.fn().mockResolvedValue('sent'),
    sendOrderCreated: jest.fn().mockResolvedValue('sent'),
    sendPayLink: jest.fn().mockResolvedValue('sent'),
    sendReceipt: jest.fn().mockResolvedValue('sent'),
    sendItemWithdrawn: jest.fn().mockResolvedValue('sent'),
    sendPromoterAlert: jest.fn().mockResolvedValue('sent'),
  };
  const sms = {
    canText: jest.fn((b: Record<string, unknown>) =>
      Boolean(b.phone_verified_at && b.sms_consent),
    ),
    send: jest.fn().mockResolvedValue(true),
  };
  const payments = {
    loadBidder: jest.fn().mockResolvedValue(bidder),
    loadOrder: jest.fn().mockResolvedValue(order),
    loadPromoter: jest
      .fn()
      .mockResolvedValue({ id: 'promoter-1', email: 'promoter@example.org' }),
    issuePayLink: jest.fn().mockResolvedValue({
      url: 'https://app.test/auctions/pay/TOKEN',
      expiresAt: FUTURE,
    }),
  };
  const config = {
    get: (k: string) =>
      ({ FRONTEND_URL: 'https://app.test', AUCTIONS_ENABLED: 'true' })[k],
  };
  const service = new AuctionNotificationsService(
    { getAdminClient: () => db.client() } as never,
    config as never,
    mail as never,
    sms as never,
    payments as never,
  );
  return { service, db, mail, sms, payments };
}

const rowUpdates = (db: FakeDb) =>
  db
    .ops('auction_outbox', 'update')
    .map((c) => c.payload as Record<string, unknown>);

describe('AuctionNotificationsService outbox', () => {
  it('marks a delivered row sent', async () => {
    const { service, db, mail } = setup([row()]);
    expect(await service.processOutbox()).toEqual({ sent: 1, failed: 0 });
    expect(mail.sendOutbid).toHaveBeenCalledTimes(1);
    expect(rowUpdates(db).some((p) => p.status === 'sent')).toBe(true);
  });

  it('retries a failed row with exponential backoff and returns it to pending', async () => {
    const { service, db, mail } = setup([row({ attempts: 3 })]);
    mail.sendOutbid.mockRejectedValue(
      new Error('Resend: down for sam@example.com'),
    );
    const before = Date.now();
    expect(await service.processOutbox()).toEqual({ sent: 0, failed: 1 });
    const update = rowUpdates(db).find((p) => p.status === 'pending')!;
    expect(update).toBeDefined();
    const delayMs =
      new Date(update.next_attempt_at as string).getTime() - before;
    expect(delayMs).toBeGreaterThanOrEqual(
      outboxBackoffSeconds(3) * 1000 - 1000,
    );
    expect(delayMs).toBeLessThan(outboxBackoffSeconds(3) * 1000 + 5000);
    expect(String(update.last_error)).not.toContain('sam@example.com');
  });

  it('backs off 1, 2, 4, 8 minutes', () => {
    expect([1, 2, 3, 4].map(outboxBackoffSeconds)).toEqual([60, 120, 240, 480]);
  });

  it(`gives up after ${OUTBOX_MAX_ATTEMPTS} attempts`, async () => {
    const { service, db, mail } = setup([
      row({ attempts: OUTBOX_MAX_ATTEMPTS }),
    ]);
    mail.sendOutbid.mockRejectedValue(new Error('still down'));
    await service.processOutbox();
    expect(rowUpdates(db).some((p) => p.status === 'failed')).toBe(true);
    expect(rowUpdates(db).some((p) => p.status === 'pending')).toBe(false);
  });

  it('keeps going after one row fails', async () => {
    const { service, mail } = setup([
      row({ id: 1 }),
      row({
        id: 2,
        kind: 'won',
        payload: { item_title: 'Vase', price_cents: 500 },
      }),
    ]);
    mail.sendOutbid.mockRejectedValue(new Error('x'));
    expect(await service.processOutbox()).toEqual({ sent: 1, failed: 1 });
    expect(mail.sendWon).toHaveBeenCalledTimes(1);
  });

  it('treats unknown kinds as handled without sending anything', async () => {
    const { service, mail } = setup([row({ kind: 'mystery' })]);
    expect(await service.processOutbox()).toEqual({ sent: 1, failed: 0 });
    expect(Object.values(mail).every((m) => m.mock.calls.length === 0)).toBe(
      true,
    );
  });

  it('does nothing when auctions are disabled', async () => {
    const { service, db } = setup([row()]);
    (service as unknown as { config: unknown }).config = { get: () => 'false' };
    await service.runOutbox();
    expect(db.rpcCalls).toHaveLength(0);
  });
});

describe('outbid notifications', () => {
  it('always emails and texts a verified, consenting bidder', async () => {
    const { service, mail, sms, db } = setup([row()]);
    await service.processOutbox();
    expect(mail.sendOutbid).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'sam@example.com',
        name: 'Sam',
        itemTitle: 'Signed guitar',
        priceCents: 12_000,
      }),
    );
    expect(sms.send).toHaveBeenCalledTimes(1);
    expect(rowUpdates(db).some((p) => typeof p.sms_sent_at === 'string')).toBe(
      true,
    );
  });

  it.each([
    ['unverified phone', { phone_verified_at: null }],
    ['no SMS consent', { sms_consent: false }],
  ])('emails but does not text with %s', async (_label, override) => {
    const { service, mail, sms } = setup([row()], { bidder: override });
    await service.processOutbox();
    expect(mail.sendOutbid).toHaveBeenCalledTimes(1);
    expect(sms.send).not.toHaveBeenCalled();
  });

  it('throttles to one text per item per 5 minutes but still emails', async () => {
    const { service, db, mail, sms } = setup([row()]);
    db.on('auction_outbox.select', { count: 1 });
    await service.processOutbox();
    expect(mail.sendOutbid).toHaveBeenCalledTimes(1);
    expect(sms.send).not.toHaveBeenCalled();
    const throttle = db.ops('auction_outbox', 'select')[0];
    expect(throttle.filters).toContainEqual(['eq', 'item_id', 'item-1']);
    expect(throttle.filters).toContainEqual(['eq', 'bidder_id', 'bidder-1']);
    const sinceFilter = throttle.filters.find(
      (f) => f[0] === 'gte' && f[1] === 'sms_sent_at',
    )!;
    const ageMs = Date.now() - new Date(sinceFilter[2] as string).getTime();
    expect(ageMs).toBeGreaterThanOrEqual(5 * 60_000 - 1000);
    expect(ageMs).toBeLessThan(5 * 60_000 + 5000);
  });

  it('an SMS failure never fails the row', async () => {
    const { service, sms } = setup([row()]);
    sms.send.mockResolvedValue(false);
    expect(await service.processOutbox()).toEqual({ sent: 1, failed: 0 });
  });
});

describe('payment notifications', () => {
  it('sends the receipt once: a row whose receipt is already claimed sends nothing', async () => {
    const claimedAlready = setup([
      row({ kind: 'payment_succeeded', order_id: 'order-1' }),
    ]);
    claimedAlready.db.on('auction_orders.update', { data: [] });
    await claimedAlready.service.processOutbox();
    expect(claimedAlready.mail.sendReceipt).not.toHaveBeenCalled();

    const first = setup([
      row({ kind: 'payment_succeeded', order_id: 'order-1' }),
    ]);
    first.db.on('auction_orders.update', { data: [{ id: 'order-1' }] });
    first.db.on('auction_order_items.select', {
      data: [
        {
          title: 'Guitar',
          quantity: 1,
          price_cents: 10_000,
          fair_market_value_cents: 6_000,
        },
      ],
    });
    await first.service.processOutbox();
    expect(first.mail.sendReceipt).toHaveBeenCalledTimes(1);
    expect(first.mail.sendReceipt.mock.calls[0][0]).toMatchObject({
      orgEin: '123456789',
      items: [{ title: 'Guitar', priceCents: 10_000, fmvCents: 6_000 }],
    });
    expect(first.db.ops('auction_orders', 'update')[0].filters).toContainEqual([
      'is',
      'receipt_sent_at',
      null,
    ]);
  });

  it('releases the receipt claim when sending fails so the retry can send it', async () => {
    const { service, db, mail } = setup([
      row({ kind: 'payment_succeeded', order_id: 'order-1' }),
    ]);
    db.on('auction_orders.update', { data: [{ id: 'order-1' }] });
    db.on('auction_order_items.select', { data: [] });
    mail.sendReceipt.mockRejectedValue(new Error('down'));
    expect(await service.processOutbox()).toEqual({ sent: 0, failed: 1 });
    const patches = db
      .ops('auction_orders', 'update')
      .map((c) => c.payload as Record<string, unknown>);
    expect(patches.at(-1)).toEqual({ receipt_sent_at: null });
  });

  it('payment_failed emails a fresh pay link and texts a consenting bidder', async () => {
    const { service, mail, sms, payments } = setup([
      row({
        kind: 'payment_failed',
        order_id: 'order-1',
        payload: { status: 'failed', requires_action: false },
      }),
    ]);
    await service.processOutbox();
    expect(payments.issuePayLink).toHaveBeenCalledTimes(1);
    expect(mail.sendPayLink).toHaveBeenCalledWith(
      expect.objectContaining({
        payUrl: 'https://app.test/auctions/pay/TOKEN',
        reason: 'failed',
        willRetry: true,
      }),
    );
    expect(sms.send.mock.calls[0][1]).toContain(
      'https://app.test/auctions/pay/TOKEN',
    );
  });

  it('payment_failed with requires_action says the card will not be retried', async () => {
    const { service, mail } = setup(
      [
        row({
          kind: 'payment_failed',
          order_id: 'order-1',
          payload: { requires_action: true },
        }),
      ],
      { order: { status: 'requires_action' } },
    );
    await service.processOutbox();
    expect(mail.sendPayLink.mock.calls[0][0].willRetry).toBe(false);
  });

  it('payment_failed for an internal error alerts the promoter instead of the bidder', async () => {
    const { service, mail, payments } = setup(
      [row({ kind: 'payment_failed', order_id: 'order-1' })],
      { order: { last_error_code: 'connect_unavailable' } },
    );
    await service.processOutbox();
    expect(mail.sendPayLink).not.toHaveBeenCalled();
    expect(payments.issuePayLink).not.toHaveBeenCalled();
    expect(mail.sendPromoterAlert).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'promoter@example.org' }),
    );
  });

  it('payment_failed is skipped once the order was paid meanwhile', async () => {
    const { service, mail } = setup(
      [row({ kind: 'payment_failed', order_id: 'order-1' })],
      { order: { status: 'paid' } },
    );
    await service.processOutbox();
    expect(mail.sendPayLink).not.toHaveBeenCalled();
  });

  it('payment_defaulted alerts the promoter, not the bidder', async () => {
    const { service, mail } = setup(
      [row({ kind: 'payment_defaulted', order_id: 'order-1' })],
      {
        order: { status: 'defaulted' },
      },
    );
    await service.processOutbox();
    expect(mail.sendPromoterAlert).toHaveBeenCalledTimes(1);
    expect(mail.sendPayLink).not.toHaveBeenCalled();
    expect(
      mail.sendPromoterAlert.mock.calls[0][0].lines.join(' '),
    ).not.toContain('sam@example.com');
  });

  it('reserve_not_met alerts the promoter', async () => {
    const { service, db, mail } = setup([
      row({
        kind: 'reserve_not_met',
        bidder_id: null,
        payload: { item_title: 'Vase', top_bid_cents: 4000 },
      }),
    ]);
    db.on('auctions.select', {
      data: {
        id: 'auction-1',
        title: 'Gala',
        promoter_account_id: 'promoter-1',
      },
    });
    await service.processOutbox();
    expect(mail.sendPromoterAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'promoter@example.org',
        subject: 'Reserve not met: Vase',
      }),
    );
  });

  it('order_created emails only for settlement orders', async () => {
    const settlement = setup([
      row({
        kind: 'order_created',
        order_id: 'order-1',
        payload: { kind: 'settlement' },
      }),
    ]);
    await settlement.service.processOutbox();
    expect(settlement.mail.sendOrderCreated).toHaveBeenCalledTimes(1);

    const buyNow = setup([
      row({
        kind: 'order_created',
        order_id: 'order-1',
        payload: { kind: 'buy_now' },
      }),
    ]);
    await buyNow.service.processOutbox();
    expect(buyNow.mail.sendOrderCreated).not.toHaveBeenCalled();
  });

  it('item_withdrawn emails the bidder', async () => {
    const { service, db, mail } = setup([
      row({ kind: 'item_withdrawn', payload: { item_title: 'Vase' } }),
    ]);
    db.on('auctions.select', {
      data: {
        id: 'auction-1',
        title: 'Gala',
        promoter_account_id: 'promoter-1',
      },
    });
    await service.processOutbox();
    expect(mail.sendItemWithdrawn).toHaveBeenCalledWith(
      expect.objectContaining({ itemTitle: 'Vase', auctionTitle: 'Gala' }),
    );
  });
});
