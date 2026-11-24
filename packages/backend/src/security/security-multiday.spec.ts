import { randomUUID } from 'crypto';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import { SecurityEventsService } from './security-events.service';

const OWNER = 'owner-1';
const EVENT = randomUUID();
const GUARD = randomUUID();
const TOKEN = 'c'.repeat(32);

function setup() {
  const db = new FakeDb({
    event: [
      {
        id: EVENT,
        owner_id: OWNER,
        name: 'Fest',
        date: '2026-07-10',
        end_date: '2026-07-12',
        start_time: '18:00',
        end_time: '23:00',
      },
    ],
    security: [
      {
        id: GUARD,
        owner_id: OWNER,
        event_id: EVENT,
        name: 'Marcus Hill',
        phone: '+16015550111',
        check_in_token: TOKEN,
        arrival_time: null,
      },
    ],
  });
  db.nextId = () => randomUUID();
  const sms = { securityAssigned: jest.fn(), sendOne: jest.fn() };
  const service = new SecurityEventsService(
    { getAdminClient: () => db } as any,
    { get: () => 'https://www.eventecos.com' } as any,
    sms as any,
    {} as any,
    {} as any,
  );
  return { db, service };
}

const at = (iso: string) => Date.parse(iso);

describe('security guards on a multi-day event', () => {
  afterEach(() => jest.useRealTimers());
  const setNow = (iso: string) => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(iso));
  };

  it('lets a guard check in once per day', async () => {
    const { service, db } = setup();

    setNow('2026-07-10T23:00:00Z');
    const day1: any = await service.publicArrive(
      TOKEN,
      at('2026-07-10T23:00:00Z'),
    );
    expect(day1.arrived).toBe(true);
    expect(day1.event_day).toMatchObject({ index: 1, total: 3 });

    // Tapping again the same day does not add a second arrival.
    await service.publicArrive(TOKEN, at('2026-07-10T23:30:00Z'));
    expect(db.rows('security_day_arrivals')).toHaveLength(1);

    // The next day starts with the guard not yet arrived.
    setNow('2026-07-11T17:00:00Z');
    const view: any = await service.publicView(TOKEN);
    expect(view.arrived).toBe(false);
    expect(view.event_day).toMatchObject({ index: 2, total: 3 });

    const day2: any = await service.publicArrive(
      TOKEN,
      at('2026-07-11T23:00:00Z'),
    );
    expect(day2.arrived).toBe(true);
    expect(db.rows('security_day_arrivals')).toHaveLength(2);
    // The guard row keeps the first arrival.
    expect(db.rows('security')[0].arrival_time).toBeTruthy();
  });

  it('refuses a check-in outside the event dates', async () => {
    const { service } = setup();
    setNow('2026-07-20T18:00:00Z');
    await expect(
      service.publicArrive(TOKEN, at('2026-07-20T18:00:00Z')),
    ).rejects.toThrow('runs 2026-07-10 to 2026-07-12');
  });

  it("shows the manager only today's arrivals and lets them undo one", async () => {
    const { service } = setup();
    setNow('2026-07-10T23:00:00Z');
    await service.setArrival(OWNER, GUARD, true);
    let list: any = await service.list(OWNER, EVENT);
    expect(list.guards[0].arrival_time).toBeTruthy();
    expect(list.guards[0].arrival_source).toBe('manager');

    setNow('2026-07-11T23:00:00Z');
    list = await service.list(OWNER, EVENT);
    expect(list.guards[0].arrival_time).toBeNull();

    setNow('2026-07-10T23:00:00Z');
    await service.setArrival(OWNER, GUARD, false);
    list = await service.list(OWNER, EVENT);
    expect(list.guards[0].arrival_time).toBeNull();
  });

  it('does not set up pay on a multi-day event', async () => {
    const { service } = setup();
    await expect(
      service.assign(OWNER, EVENT, {
        guards: [{ name: 'Ray Cole', phone: '6015550199' }],
        pay: { pay_type: 'flat', rate: 100 },
      }),
    ).rejects.toThrow('one day at a time');
  });
});
