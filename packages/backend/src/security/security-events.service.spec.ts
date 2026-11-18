import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import { SecurityEventsService } from './security-events.service';

const OWNER = 'owner-1';
const OTHER = 'owner-2';
const EVENT = randomUUID();
const OTHER_EVENT = randomUUID();
const THEIR_EVENT = randomUUID();

function setup() {
  const db = new FakeDb({
    events: [
      { id: EVENT, owner_id: OWNER, name: 'Gala', date: '2026-11-21' },
      { id: OTHER_EVENT, owner_id: OWNER, name: 'Wedding', date: '2026-10-01' },
      { id: THEIR_EVENT, owner_id: OTHER, name: 'Theirs', date: '2026-11-21' },
    ],
    security: [
      // a guard used on an earlier event
      {
        id: randomUUID(),
        owner_id: OWNER,
        event_id: OTHER_EVENT,
        name: 'Marcus Hill',
        phone: '+16015550111',
        created_at: '2026-10-01T00:00:00Z',
        check_in_token: 'a'.repeat(32),
      },
      {
        id: randomUUID(),
        owner_id: OWNER,
        event_id: OTHER_EVENT,
        name: 'Dee Dee',
        phone: '+16015550112',
        created_at: '2026-10-01T00:00:00Z',
        check_in_token: 'b'.repeat(32),
      },
    ],
  });
  db.nextId = () => randomUUID();
  const sms = { securityAssigned: jest.fn().mockResolvedValue(true) };
  const service = new SecurityEventsService(
    { getAdminClient: () => db } as any,
    { get: () => 'https://www.eventecos.com' } as any,
    sms as any,
  );
  return { db, sms, service };
}

const guard = (name: string, phone: string) => ({ name, phone });

describe('adding guards to an event', () => {
  it('creates one row each with its own link and texts them their post and report time', async () => {
    const { service, sms, db } = setup();
    const out: any = await service.assign(OWNER, EVENT, {
      guards: [
        guard('Marcus Hill', '601-555-0111'),
        guard('Ray Cole', '6015550199'),
      ],
      report_time: '17:30',
      post: 'Front door',
    });
    expect(out.guards).toHaveLength(2);
    expect(out.guards.every((g: any) => g.texted)).toBe(true);
    const rows = db.rows('security').filter((r) => r.event_id === EVENT);
    expect(rows.map((r) => r.phone).sort()).toEqual([
      '+16015550111',
      '+16015550199',
    ]);
    expect(rows[0].check_in_token).toMatch(/^[0-9a-f]{32}$/);
    expect(rows[0].check_in_token).not.toBe(rows[1].check_in_token);
    expect(rows[0]).toMatchObject({
      report_time: '17:30',
      post: 'Front door',
      owner_id: OWNER,
    });

    const [phone, name, event, date, , extra] =
      sms.securityAssigned.mock.calls[0];
    expect([phone, name, event, date]).toEqual([
      '+16015550111',
      'Marcus',
      'Gala',
      'Sat, Nov 21',
    ]);
    expect(extra).toMatchObject({ reportTime: '5:30 PM', post: 'Front door' });
    expect(extra.checkInUrl).toBe(
      `https://www.eventecos.com/security/check-in/${rows[0].check_in_token}`,
    );
    expect(JSON.stringify(out)).not.toContain('check_in_token');
  });

  it('can skip the text', async () => {
    const { service, sms } = setup();
    await service.assign(OWNER, EVENT, {
      guards: [guard('Ray', '6015550199')],
      send_text: false,
    });
    expect(sms.securityAssigned).not.toHaveBeenCalled();
  });

  it('does not add the same number twice and says who was skipped', async () => {
    const { service } = setup();
    await service.assign(OWNER, EVENT, {
      guards: [guard('Marcus', '6015550111')],
    });
    const again: any = await service.assign(OWNER, EVENT, {
      guards: [guard('Marcus Hill', '6015550111'), guard('Ray', '6015550199')],
    });
    expect(again.skipped).toEqual(['Marcus Hill']);
    expect(again.guards).toHaveLength(1);
    await expect(
      service.assign(OWNER, EVENT, { guards: [guard('Ray', '6015550199')] }),
    ).rejects.toThrow(ConflictException);
  });

  it("rejects an empty request or a bad number, and never touches another venue's event", async () => {
    const { service } = setup();
    await expect(service.assign(OWNER, EVENT, { guards: [] })).rejects.toThrow(
      BadRequestException,
    );
    await expect(
      service.assign(OWNER, EVENT, { guards: [guard('Ray', '12')] }),
    ).rejects.toThrow('valid mobile number');
    await expect(
      service.assign(OWNER, THEIR_EVENT, {
        guards: [guard('Ray', '6015550199')],
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.list(OWNER, THEIR_EVENT)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('offers guards used before who are not already on this event', async () => {
    const { service } = setup();
    expect(
      (await service.directory(OWNER, EVENT)).map((p) => p.name).sort(),
    ).toEqual(['Dee Dee', 'Marcus Hill']);
    await service.assign(OWNER, EVENT, {
      guards: [guard('Marcus Hill', '6015550111')],
    });
    expect((await service.directory(OWNER, EVENT)).map((p) => p.name)).toEqual([
      'Dee Dee',
    ]);
    expect(await service.directory(OTHER, THEIR_EVENT)).toEqual([]);
  });
});

describe('arrival', () => {
  async function oneGuard(service: SecurityEventsService, db: FakeDb) {
    await service.assign(OWNER, EVENT, {
      guards: [guard('Ray Cole', '6015550199')],
    });
    return db.rows('security').find((r) => r.phone === '+16015550199')!;
  }

  it('lets the guard check in from their link, once, without exposing private details', async () => {
    const { service, db } = setup();
    const row = await oneGuard(service, db);
    const view: any = await service.publicView(row.check_in_token);
    expect(view).toMatchObject({
      guard_first_name: 'Ray',
      event_name: 'Gala',
      arrived: false,
    });
    expect(JSON.stringify(view)).not.toMatch(/phone|owner_id|token/);

    const at = Date.parse('2026-11-21T23:00:00Z');
    const arrived: any = await service.publicArrive(row.check_in_token, at);
    expect(arrived.arrived).toBe(true);
    expect(db.rows('security').find((r) => r.id === row.id)).toMatchObject({
      arrival_source: 'guard',
    });
    const stamp = db
      .rows('security')
      .find((r) => r.id === row.id)!.arrival_time;
    await service.publicArrive(row.check_in_token, at + 3600_000);
    expect(db.rows('security').find((r) => r.id === row.id)!.arrival_time).toBe(
      stamp,
    );
  });

  it('will not check in far from the event date, or on a made-up link', async () => {
    const { service, db } = setup();
    const row = await oneGuard(service, db);
    await expect(
      service.publicArrive(
        row.check_in_token,
        Date.parse('2026-12-25T12:00:00Z'),
      ),
    ).rejects.toThrow(BadRequestException);
    await expect(service.publicView('nope')).rejects.toThrow(NotFoundException);
    await expect(service.publicArrive('f'.repeat(32))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('lets the manager mark arrival and undo it, for their own guards only', async () => {
    const { service, db } = setup();
    const row = await oneGuard(service, db);
    await service.setArrival(OWNER, row.id, true);
    expect(db.rows('security').find((r) => r.id === row.id)).toMatchObject({
      arrival_source: 'manager',
    });
    expect(
      db.rows('security').find((r) => r.id === row.id)!.arrival_time,
    ).toBeTruthy();
    await service.setArrival(OWNER, row.id, false);
    expect(
      db.rows('security').find((r) => r.id === row.id)!.arrival_time,
    ).toBeNull();
    await expect(service.setArrival(OTHER, row.id, true)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('can text a guard their assignment again', async () => {
    const { service, sms, db } = setup();
    const row = await oneGuard(service, db);
    sms.securityAssigned.mockClear();
    const out = await service.resend(OWNER, row.id);
    expect(out.texted).toBe(true);
    expect(sms.securityAssigned).toHaveBeenCalledTimes(1);
    await expect(service.resend(OTHER, row.id)).rejects.toThrow(
      NotFoundException,
    );
  });
});
