import { AuctionCloserService } from './auction-closer.service';
import { FakeDb } from './fake-db';

function setup(opts: { enabled?: boolean } = {}) {
  const db = new FakeDb();
  db.onRpc('close_due_auction_items', { data: [] });
  db.onRpc('claim_orders_for_charge', { data: [] });
  db.onRpc('settle_auction', { data: { ok: true, orders_created: 2 } });
  const payments = {
    chargeClaimedOrder: jest
      .fn()
      .mockResolvedValue({ orderId: 'o', status: 'paid' }),
    detachStaleCards: jest.fn().mockResolvedValue(0),
  };
  const config = { get: () => (opts.enabled === false ? 'false' : 'true') };
  const service = new AuctionCloserService(
    { getAdminClient: () => db.client() } as never,
    config as never,
    payments as never,
  );
  return { service, db, payments };
}

describe('AuctionCloserService', () => {
  it('does nothing when auctions are disabled', async () => {
    const { service, db, payments } = setup({ enabled: false });
    await service.closeAndSettle();
    await service.promoteAndCharge();
    await service.detachCards();
    expect(db.rpcCalls).toHaveLength(0);
    expect(db.calls).toHaveLength(0);
    expect(payments.detachStaleCards).not.toHaveBeenCalled();
  });

  it('closes due items, then settles closed auctions with the platform rate', async () => {
    const { service, db } = setup();
    db.on('auctions.select', (call) => ({
      data: call.filters.some((f) => f[0] === 'eq' && f[2] === 'closed')
        ? [{ id: 'auction-1' }]
        : [],
    }));
    db.on('auction_items.select', { count: 0 });
    await service.closeAndSettle();
    expect(db.rpcCalls.map((c) => c.fn)).toEqual([
      'close_due_auction_items',
      'settle_auction',
    ]);
    expect(db.rpcArgs('settle_auction')[0]).toEqual({
      p_auction_id: 'auction-1',
      p_platform_fee_rate: 0.015,
    });
  });

  it('does not settle while an item is open or awaiting a reserve decision', async () => {
    const { service, db } = setup();
    db.on('auctions.select', { data: [{ id: 'auction-1' }] });
    db.on('auction_items.select', { count: 1 });
    await service.closeAndSettle();
    expect(db.rpcArgs('settle_auction')).toHaveLength(0);
    const check = db.ops('auction_items', 'select')[0];
    expect(check.filters).toContainEqual([
      'in',
      'status',
      ['open', 'reserve_not_met'],
    ]);
  });

  it('also settles live auctions past their end with nothing left open', async () => {
    const { service, db } = setup();
    db.on('auctions.select', (call) => ({
      data: call.filters.some((f) => f[0] === 'eq' && f[2] === 'live')
        ? [{ id: 'auction-9' }]
        : [],
    }));
    db.on('auction_items.select', { count: 0 });
    await service.closeAndSettle();
    expect(db.rpcArgs('settle_auction')[0]).toMatchObject({
      p_auction_id: 'auction-9',
    });
  });

  it('keeps going when settling one auction throws', async () => {
    const { service, db } = setup();
    db.on('auctions.select', { data: [{ id: 'a1' }, { id: 'a2' }] });
    db.on('auction_items.select', { count: 0 });
    let n = 0;
    db.onRpc('settle_auction', () =>
      n++ === 0
        ? { error: { message: 'boom' } }
        : { data: { ok: true, orders_created: 1 } },
    );
    await expect(service.closeAndSettle()).resolves.toBeUndefined();
    expect(db.rpcArgs('settle_auction')).toHaveLength(2);
  });

  it('survives an RPC error without throwing', async () => {
    const { service, db } = setup();
    db.onRpc('close_due_auction_items', { error: { message: 'down' } });
    await expect(service.closeAndSettle()).resolves.toBeUndefined();
  });

  it('does not overlap itself (in-process guard)', async () => {
    const { service, db } = setup();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    db.onRpc('close_due_auction_items', () => ({ data: [] }));
    const original = db.rpc.bind(db);
    db.rpc = (fn: string, args?: Record<string, unknown>) =>
      fn === 'close_due_auction_items'
        ? gate.then(() => original(fn, args))
        : original(fn, args);
    const first = service.closeAndSettle();
    await service.closeAndSettle();
    release();
    await first;
    expect(db.rpcArgs('close_due_auction_items')).toHaveLength(1);
  });

  it('promotes scheduled auctions whose start has passed with one UPDATE', async () => {
    const { service, db } = setup();
    db.on('auctions.update', { data: [{ id: 'a1' }, { id: 'a2' }] });
    expect(await service.promoteScheduledAuctions()).toBe(2);
    const update = db.ops('auctions', 'update')[0];
    expect(update.payload).toMatchObject({ status: 'live' });
    expect(update.filters).toContainEqual(['eq', 'status', 'scheduled']);
    expect(
      update.filters.some((f) => f[0] === 'lte' && f[1] === 'starts_at'),
    ).toBe(true);
  });

  it('charges each claimed order and continues after one throws', async () => {
    const { service, db, payments } = setup();
    db.onRpc('claim_orders_for_charge', {
      data: [{ id: 'o1' }, { id: 'o2' }, { id: 'o3' }],
    });
    payments.chargeClaimedOrder
      .mockRejectedValueOnce(new Error('stripe hiccup'))
      .mockResolvedValue({ status: 'paid' });
    await service.promoteAndCharge();
    expect(payments.chargeClaimedOrder).toHaveBeenCalledTimes(3);
  });

  it('detaches stale cards through the payments service', async () => {
    const { service, payments } = setup();
    payments.detachStaleCards.mockResolvedValue(3);
    await service.detachCards();
    expect(payments.detachStaleCards).toHaveBeenCalledTimes(1);
  });
});
