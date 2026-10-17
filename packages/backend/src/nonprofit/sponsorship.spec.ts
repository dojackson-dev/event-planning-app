import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { NonprofitService } from './nonprofit.service';
import { SponsorshipService } from './sponsorship.service';

const EVENT = '11111111-1111-4111-8111-111111111111';
const LEVEL = '22222222-2222-4222-8222-222222222222';

function setup(opts: {
  ownsEvent?: boolean;
  level?: Record<string, unknown> | null;
  verified?: boolean;
}) {
  const calls: Array<{ table: string; op: string; arg?: unknown }> = [];
  const from = (table: string) => {
    let op = 'select';
    const b: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq', 'order']) {
      b[m] = jest.fn().mockReturnValue(b);
    }
    for (const m of ['insert', 'update', 'delete']) {
      b[m] = jest.fn().mockImplementation((arg?: unknown) => {
        op = m;
        calls.push({ table, op: m, arg });
        return b;
      });
    }
    const result = () => {
      if (table === 'public_events') {
        return { data: opts.ownsEvent === false ? null : { id: EVENT } };
      }
      if (op === 'select') return { data: opts.level ?? null };
      return { data: { id: LEVEL, ...(opts.level ?? {}) }, error: null };
    };
    b.maybeSingle = jest
      .fn()
      .mockImplementation(() => Promise.resolve(result()));
    b.single = jest.fn().mockImplementation(() => Promise.resolve(result()));
    (b as unknown as { then: unknown }).then = (
      resolve: (v: unknown) => unknown,
    ) => resolve({ error: null });
    return b;
  };
  const supabase = {
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService;
  const nonprofit = {
    assertVerified: jest
      .fn()
      .mockImplementation(() =>
        opts.verified === false
          ? Promise.reject(
              new BadRequestException('Verify your non-profit status'),
            )
          : Promise.resolve('promoter-1'),
      ),
  } as unknown as NonprofitService;
  return { service: new SponsorshipService(supabase, nonprofit), calls };
}

const valid = { name: ' Gold Sponsor ', price: 1000, fairMarketValue: 200 };

describe('SponsorshipService', () => {
  it('requires a verified non-profit', async () => {
    const { service } = setup({ verified: false });
    await expect(service.create('u1', EVENT, valid)).rejects.toThrow(
      /Verify your non-profit/,
    );
  });

  it('404s when the event belongs to another promoter', async () => {
    const { service } = setup({ ownsEvent: false });
    await expect(service.create('u1', EVENT, valid)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates a level with trimmed name and cleaned benefits', async () => {
    const { service, calls } = setup({});
    await service.create('u1', EVENT, {
      ...valid,
      tablesIncluded: 1,
      seatsPerTable: 10,
      benefits: [' Logo on signage ', ''],
    });
    expect(calls.find((c) => c.op === 'insert')?.arg).toMatchObject({
      public_event_id: EVENT,
      name: 'Gold Sponsor',
      price: 1000,
      fair_market_value: 200,
      tables_included: 1,
      seats_per_table: 10,
      benefits: ['Logo on signage'],
    });
  });

  it('rejects fair market value above the price', async () => {
    const { service } = setup({});
    await expect(
      service.create('u1', EVENT, { ...valid, fairMarketValue: 5000 }),
    ).rejects.toThrow(/Fair market value/);
  });

  it('requires seats per table when tables are included', async () => {
    const { service } = setup({});
    await expect(
      service.create('u1', EVENT, { ...valid, tablesIncluded: 2 }),
    ).rejects.toThrow(/seats per table/i);
  });

  it('rejects bad numbers and a missing name', async () => {
    const { service } = setup({});
    await expect(
      service.create('u1', EVENT, { ...valid, price: -5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create('u1', EVENT, { ...valid, name: '  ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create('u1', EVENT, { ...valid, ticketsIncluded: 1.5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('will not lower quantity below what is already sold', async () => {
    const { service } = setup({
      level: {
        id: LEVEL,
        public_event_id: EVENT,
        quantity_sold: 4,
        price: 1000,
      },
    });
    await expect(
      service.update('u1', LEVEL, { quantityAvailable: 3 }),
    ).rejects.toThrow(/already sold/);
  });

  it('deactivates instead of deleting a level that has sold', async () => {
    const { service, calls } = setup({
      level: {
        id: LEVEL,
        public_event_id: EVENT,
        quantity_sold: 2,
        price: 500,
      },
    });
    expect(await service.remove('u1', LEVEL)).toEqual({
      deleted: false,
      deactivated: true,
    });
    expect(calls.some((c) => c.op === 'delete')).toBe(false);
  });

  it('deletes a level that has not sold', async () => {
    const { service, calls } = setup({
      level: {
        id: LEVEL,
        public_event_id: EVENT,
        quantity_sold: 0,
        price: 500,
      },
    });
    expect(await service.remove('u1', LEVEL)).toEqual({
      deleted: true,
      deactivated: false,
    });
    expect(calls.some((c) => c.op === 'delete')).toBe(true);
  });
});
