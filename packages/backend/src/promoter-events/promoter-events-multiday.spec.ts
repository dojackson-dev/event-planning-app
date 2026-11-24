import { PromoterEventsService } from './promoter-events.service';

const TICKET_ID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f';

const event = {
  id: 'e1',
  event_date: '2026-07-10',
  end_date: '2026-07-12',
  start_time: '18:00',
  end_time: '23:00',
  state: 'MS',
  timezone: null,
};

function scanner() {
  const scans: { ticket_id: string; scan_date: string }[] = [];
  const ticket: any = {
    id: TICKET_ID,
    status: 'valid',
    public_event_id: 'e1',
    scanned_at: null,
    ticket_tiers: { name: 'Weekend' },
  };
  const from = (table: string) => {
    let op = 'select';
    let patch: any;
    let row: any;
    const q: any = {};
    q.select = () => q;
    q.insert = (r: any) => {
      op = 'insert';
      row = r;
      return q;
    };
    q.update = (p: any) => {
      op = 'update';
      patch = p;
      return q;
    };
    q.eq = () => q;
    q.maybeSingle = () =>
      Promise.resolve({
        data:
          table === 'public_events'
            ? event
            : table === 'tickets'
              ? ticket
              : null,
      });
    q.then = (resolve: (v: unknown) => void) => {
      if (table === 'ticket_scans' && op === 'insert') {
        const dup = scans.some(
          (s) => s.ticket_id === row.ticket_id && s.scan_date === row.scan_date,
        );
        if (dup) return resolve({ error: { code: '23505', message: 'dup' } });
        scans.push(row);
        return resolve({ error: null });
      }
      if (table === 'ticket_scans')
        return resolve({ count: scans.length, error: null });
      if (table === 'tickets' && op === 'update') Object.assign(ticket, patch);
      return resolve({ error: null });
    };
    return q;
  };
  const service = new PromoterEventsService(
    { getAdminClient: () => ({ from }) } as any,
    { get: () => 'sk_test_dummy' } as any,
    {} as any,
    {} as any,
  );
  (service as any).getPromoterAccount = () => Promise.resolve({ id: 'p1' });
  return { service, ticket, scans };
}

describe('door scan on a multi-day event', () => {
  afterEach(() => jest.useRealTimers());
  const setNow = (iso: string) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(iso));
  };

  it('scans the same ticket once per day, then marks it used after the last day', async () => {
    const { service, ticket } = scanner();

    setNow('2026-07-10T23:00:00Z'); // day 1, Mississippi evening
    const day1: any = await service.scanTicket('u1', 'e1', TICKET_ID);
    expect(day1.valid).toBe(true);
    expect(day1.day).toEqual({ date: '2026-07-10', index: 1, total: 3 });
    expect(day1.ticket.status).toBe('valid');
    await expect(service.scanTicket('u1', 'e1', TICKET_ID)).rejects.toThrow(
      'already been scanned for today (Day 1 of 3)',
    );

    setNow('2026-07-11T23:00:00Z');
    const day2: any = await service.scanTicket('u1', 'e1', TICKET_ID);
    expect(day2.day.index).toBe(2);
    expect(ticket.status).toBe('valid');

    setNow('2026-07-12T23:00:00Z');
    const day3: any = await service.scanTicket('u1', 'e1', TICKET_ID);
    expect(day3.ticket.status).toBe('used');
    expect(ticket.status).toBe('used');
    await expect(service.scanTicket('u1', 'e1', TICKET_ID)).rejects.toThrow(
      'every day',
    );
  });

  it('counts days in the event timezone', async () => {
    const { service } = scanner();
    // 02:00 UTC on the 12th is still the 11th (day 2) in Mississippi.
    setNow('2026-07-12T02:00:00Z');
    const result: any = await service.scanTicket('u1', 'e1', TICKET_ID);
    expect(result.day.date).toBe('2026-07-11');
  });

  it('refuses a scan outside the event dates', async () => {
    const { service } = scanner();
    setNow('2026-07-20T18:00:00Z');
    await expect(service.scanTicket('u1', 'e1', TICKET_ID)).rejects.toThrow(
      'runs 2026-07-10 to 2026-07-12',
    );
  });
});
