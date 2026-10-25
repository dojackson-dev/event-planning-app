import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { SupabaseService } from '../supabase/supabase.service';
import { VendorDoorListsService } from './vendor-door-lists.service';

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

/** Minimal chainable fake: select/eq/in/not/order, maybeSingle/single, update. */
function fakeDb(tables: Tables) {
  const updates: Array<{ table: string; id: unknown; patch: Row }> = [];
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    let patch: Row | null = null;
    const q: Record<string, unknown> = {};
    const chain = () => q;
    q.select = chain;
    q.order = chain;
    q.eq = (col: string, val: unknown) => {
      rows = rows.filter((r) => r[col] === val);
      return q;
    };
    q.in = (col: string, vals: unknown[]) => {
      rows = rows.filter((r) => vals.includes(r[col]));
      return q;
    };
    q.not = (col: string, _op: string, val: unknown) => {
      rows = rows.filter((r) => r[col] !== val);
      return q;
    };
    q.update = (p: Row) => {
      patch = p;
      return q;
    };
    const apply = () => {
      if (patch) {
        for (const r of rows) {
          Object.assign(r, patch);
          updates.push({ table, id: r.id, patch: patch });
        }
      }
    };
    q.maybeSingle = () => {
      apply();
      return Promise.resolve({ data: rows[0] ?? null, error: null });
    };
    q.single = q.maybeSingle;
    q.then = (resolve: (v: unknown) => void) => {
      apply();
      resolve({ data: rows, error: null });
    };
    return q;
  };
  const service = new VendorDoorListsService({
    getAdminClient: () => ({ from }),
  } as unknown as SupabaseService);
  return { service, updates };
}

const base = (): Tables => ({
  vendor_accounts: [
    { id: 'v-sec', user_id: 'u-sec', category: 'security', categories: null },
    { id: 'v-dj', user_id: 'u-dj', category: 'dj', categories: ['dj'] },
    {
      id: 'v-multi',
      user_id: 'u-multi',
      category: 'dj',
      categories: ['dj', 'security'],
    },
  ],
  vendor_bookings: [
    {
      vendor_account_id: 'v-sec',
      event_id: 'e1',
      event_name: 'Gala',
      event_date: '2026-11-01',
      start_time: null,
      end_time: null,
      venue_name: 'Hall',
      status: 'confirmed',
    },
    {
      vendor_account_id: 'v-sec',
      event_id: 'e2',
      event_name: 'Pending Show',
      event_date: '2026-11-02',
      status: 'pending',
    },
    {
      vendor_account_id: 'v-dj',
      event_id: 'e1',
      event_name: 'Gala',
      status: 'confirmed',
    },
  ],
  event: [{ id: 'e1', start_time: '19:00:00', end_time: '23:00:00' }],
  guest_lists: [
    { id: 10, event_id: 'e1' },
    { id: 20, event_id: 'e9' },
  ],
  guests: [
    {
      id: 1,
      guest_list_id: 10,
      name: 'Ann',
      phone: '+1555',
      has_arrived: false,
    },
    {
      id: 2,
      guest_list_id: 10,
      name: 'Bob',
      phone: '+1556',
      has_arrived: true,
    },
    {
      id: 3,
      guest_list_id: 20,
      name: 'Other Event Guest',
      phone: '+1557',
      has_arrived: false,
    },
  ],
});

describe('VendorDoorListsService', () => {
  it('lists only confirmed assigned events with counts and event times', async () => {
    const { service } = setup2();
    const events = await service.listEvents('u-sec');
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event_id: 'e1',
      start_time: '19:00:00',
      end_time: '23:00:00',
      guest_list_id: 10,
      total_guests: 2,
      arrived_guests: 1,
    });
  });

  it('is only for security vendors (single or multi category)', async () => {
    const { service } = setup2();
    await expect(service.listEvents('u-dj')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.listEvents('u-multi')).resolves.toEqual([]);
    await expect(service.listEvents('nobody')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns guests without phone numbers', async () => {
    const { service } = setup2();
    const { guests } = await service.getDoorList('u-sec', 'e1');
    expect(guests.map((g) => g.name)).toEqual(['Ann', 'Bob']);
    expect(JSON.stringify(guests)).not.toContain('+155');
  });

  it("404s for an event the vendor isn't assigned to (or isn't confirmed)", async () => {
    const { service } = setup2();
    await expect(service.getDoorList('u-sec', 'e2')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getDoorList('u-sec', 'e9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('checks a guest in and back out for an assigned event', async () => {
    const { service, updates } = setup2();
    const arrived = await service.setArrival('u-sec', 1, true);
    expect(arrived.has_arrived).toBe(true);
    expect(arrived.arrived_at).toEqual(expect.any(String));
    const undone = await service.setArrival('u-sec', 1, false);
    expect(undone).toMatchObject({ has_arrived: false, arrived_at: null });
    expect(updates).toHaveLength(2);
  });

  it('refuses to check in a guest from another event, or for a non-security vendor', async () => {
    const { service, updates } = setup2();
    await expect(service.setArrival('u-sec', 3, true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.setArrival('u-sec', 99, true)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.setArrival('u-dj', 1, true)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(updates).toHaveLength(0);
  });
});

function setup2() {
  return fakeDb(base());
}
