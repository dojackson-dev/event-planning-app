import { VipService } from './vip.service';

const event = {
  id: 'e1',
  event_date: '2026-07-10',
  end_date: '2026-07-12',
  start_time: '18:00',
  end_time: '23:00',
  state: 'MS',
};

const UNIQUE: Record<string, string[]> = {
  vip_order_day_checkins: ['vip_order_id', 'scan_date'],
  vip_pass_day_scans: ['vip_guest_pass_id', 'scan_date'],
};

/** A tiny in-memory stand-in for the Supabase client: just enough query surface for the VIP scan code. */
function fakeDb(tables: Record<string, any[]>) {
  const from = (table: string) => {
    const filters: Array<(r: any) => boolean> = [];
    let op: 'select' | 'insert' | 'upsert' | 'update' = 'select';
    let payload: any;
    let onConflict: string[] | undefined;
    let ignoreDuplicates = false;
    const rows = () => (tables[table] ??= []);
    const q: any = {};
    q.select = () => q;
    q.eq = (col: string, val: unknown) => {
      filters.push((r) => r[col] === val);
      return q;
    };
    q.in = (col: string, vals: unknown[]) => {
      filters.push((r) => vals.includes(r[col]));
      return q;
    };
    q.insert = (p: any) => {
      op = 'insert';
      payload = p;
      return q;
    };
    q.upsert = (p: any, o: any) => {
      op = 'upsert';
      payload = p;
      onConflict = (o?.onConflict as string)?.split(',');
      ignoreDuplicates = !!o?.ignoreDuplicates;
      return q;
    };
    q.update = (p: any) => {
      op = 'update';
      payload = p;
      return q;
    };
    const matching = () => rows().filter((r) => filters.every((f) => f(r)));
    const keyOf = (r: any, cols: string[]) => cols.map((c) => r[c]).join('|');
    const exec = () => {
      if (op === 'insert') {
        const cols = UNIQUE[table];
        const dup =
          cols && rows().some((r) => keyOf(r, cols) === keyOf(payload, cols));
        if (dup) return { error: { code: '23505', message: 'duplicate' } };
        rows().push({ ...payload });
        return { error: null };
      }
      if (op === 'upsert') {
        for (const item of Array.isArray(payload) ? payload : [payload]) {
          const existing = onConflict
            ? rows().find(
                (r) => keyOf(r, onConflict!) === keyOf(item, onConflict!),
              )
            : undefined;
          if (existing) {
            if (!ignoreDuplicates) Object.assign(existing, item);
          } else rows().push({ ...item });
        }
        return { error: null };
      }
      if (op === 'update') {
        matching().forEach((r) => Object.assign(r, payload));
        return { error: null };
      }
      return { data: matching(), error: null };
    };
    q.maybeSingle = () => Promise.resolve({ data: matching()[0] ?? null });
    q.then = (resolve: (v: unknown) => void) => resolve(exec());
    return q;
  };
  return { from };
}

function build() {
  const order = {
    id: 'o1',
    qr_code: 'ORDER-QR',
    public_event_id: 'e1',
    payment_status: 'paid',
    guests_checked_in: 0,
    check_in_status: 'pending',
    vip_packages: { name: 'Table', capacity: 2, table_label: null },
    vip_guest_passes: [
      { id: 'p1', status: 'valid' },
      { id: 'p2', status: 'valid' },
    ],
  };
  const tables: Record<string, any[]> = {
    public_events: [event],
    vip_orders: [order],
    vip_guest_passes: [
      {
        id: 'p1',
        qr_code: 'PASS-1',
        guest_name: 'Ann',
        status: 'valid',
        vip_order: {
          id: 'o1',
          public_event_id: 'e1',
          vip_packages: { capacity: 2 },
        },
      },
    ],
    vip_concierges: [],
  };
  const service = new VipService(
    { getAdminClient: () => fakeDb(tables) } as any,
    { get: () => 'sk_test_dummy' } as any,
    {} as any,
    {} as any,
  );
  (service as any).assertEventOwner = () => Promise.resolve({ id: 'pr1' });
  (service as any).notifyConciergesOnArrival = () => Promise.resolve();
  return { service, tables, order };
}

describe('VIP check-in on a multi-day event', () => {
  afterEach(() => jest.useRealTimers());
  const setNow = (iso: string) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(iso));
  };

  it('counts the group separately each day', async () => {
    const { service, order } = build();

    setNow('2026-07-10T23:00:00Z');
    const one: any = await service.scanVip('u1', 'e1', {
      qr_code: 'ORDER-QR',
      check_in_mode: 'single',
    } as any);
    expect(one.guests_checked_in).toBe(1);
    expect(one.day).toEqual({ date: '2026-07-10', index: 1, total: 3 });
    const two: any = await service.scanVip('u1', 'e1', {
      qr_code: 'ORDER-QR',
      check_in_mode: 'single',
    } as any);
    expect(two.guests_checked_in).toBe(2);
    await expect(
      service.scanVip('u1', 'e1', {
        qr_code: 'ORDER-QR',
        check_in_mode: 'single',
      } as any),
    ).rejects.toThrow('already checked in today (Day 1 of 3)');
    expect(order.check_in_status).toBe('checked_in');

    // The next day the whole group can come in again.
    setNow('2026-07-11T23:00:00Z');
    const next: any = await service.scanVip('u1', 'e1', {
      qr_code: 'ORDER-QR',
      check_in_mode: 'full',
    } as any);
    expect(next.guests_checked_in).toBe(2);
    expect(next.day.index).toBe(2);
  });

  it('does not use up guest passes: each pass is scanned once per day', async () => {
    const { service, tables } = build();

    setNow('2026-07-10T23:00:00Z');
    const day1: any = await service.scanVip('u1', 'e1', {
      qr_code: 'PASS-1',
    } as any);
    expect(day1.guest_name).toBe('Ann');
    await expect(
      service.scanVip('u1', 'e1', { qr_code: 'PASS-1' } as any),
    ).rejects.toThrow('Ann has already checked in today (Day 1 of 3)');

    setNow('2026-07-11T23:00:00Z');
    const day2: any = await service.scanVip('u1', 'e1', {
      qr_code: 'PASS-1',
    } as any);
    expect(day2.day.index).toBe(2);
    expect(tables.vip_guest_passes[0].status).toBe('valid');
  });

  it('refuses a scan outside the event dates', async () => {
    const { service } = build();
    setNow('2026-08-01T18:00:00Z');
    await expect(
      service.scanVip('u1', 'e1', { qr_code: 'ORDER-QR' } as any),
    ).rejects.toThrow('runs 2026-07-10 to 2026-07-12');
  });
});
