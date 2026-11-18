import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import { SecurityEventsService } from './security-events.service';
import { StaffPayService } from '../staff-pay/staff-pay.service';

const OWNER = 'owner-1';
const OTHER = 'owner-2';
const EVENT = randomUUID();
const OTHER_EVENT = randomUUID();
const THEIR_EVENT = randomUUID();

function setup() {
  const db = new FakeDb({
    event: [
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
  const sms = {
    securityAssigned: jest.fn().mockResolvedValue(true),
    sendOne: jest.fn().mockResolvedValue(true),
  };
  const staffPay = new StaffPayService(
    { getAdminClient: () => db } as any,
    { get: () => 'https://www.eventecos.com' } as any,
    sms as any,
  );
  const payouts = {
    sendSetupLink: jest.fn().mockResolvedValue({ texted: true, link: 'x' }),
  };
  const service = new SecurityEventsService(
    { getAdminClient: () => db } as any,
    { get: () => 'https://www.eventecos.com' } as any,
    sms as any,
    staffPay,
    payouts as any,
  );
  return { db, sms, service, payouts };
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

describe('paying guards through Staff Pay', () => {
  const PAY = { pay_type: 'hourly', rate: 25 };
  const NOW = Date.parse('2026-11-21T22:00:00Z');
  afterEach(() => jest.useRealTimers());

  async function paidGuard(extra: Record<string, unknown> = {}) {
    const ctx = setup();
    const out: any = await ctx.service.assign(OWNER, EVENT, {
      guards: [guard('Ray Cole', '6015550199')],
      report_time: '17:30',
      post: 'Front door',
      pay: PAY,
      ...extra,
    });
    const row = ctx.db
      .rows('security')
      .find((r) => r.phone === '+16015550199')!;
    return { ...ctx, out, row };
  }

  it('makes the guard a staff member with a shift for this event, and links them', async () => {
    const { db, out, row, payouts } = await paidGuard();
    expect(out.guards[0]).toMatchObject({ paid: true, pay_error: null });
    expect(db.rows('staff_members')).toHaveLength(1);
    expect(db.rows('staff_members')[0]).toMatchObject({
      name: 'Ray Cole',
      phone: '+16015550199',
      job_title: 'Security',
      default_pay_type: 'hourly',
      default_rate: 25,
      owner_id: OWNER,
    });
    const shift = db.rows('staff_shifts')[0];
    expect(shift).toMatchObject({
      title: 'Security: Front door',
      shift_date: '2026-11-21',
      start_time: '17:30',
      event_id: EVENT,
      pay_type: 'hourly',
      rate: 25,
      status: 'scheduled',
      owner_id: OWNER,
    });
    expect(row.staff_shift_id).toBe(shift.id);
    expect(payouts.sendSetupLink).toHaveBeenCalledTimes(1);
  });

  it('does not create staff or shifts when pay is off', async () => {
    const ctx = setup();
    await ctx.service.assign(OWNER, EVENT, {
      guards: [guard('Ray', '6015550199')],
    });
    expect(ctx.db.rows('staff_members')).toHaveLength(0);
    expect(ctx.db.rows('staff_shifts')).toHaveLength(0);
    expect(ctx.payouts.sendSetupLink).not.toHaveBeenCalled();
  });

  it('reuses an existing staff member and does not text the pay setup again', async () => {
    const ctx = setup();
    ctx.db.rows('staff_members').push({
      id: randomUUID(),
      owner_id: OWNER,
      name: 'Ray Cole',
      phone: '+16015550199',
      default_pay_type: 'flat',
      default_rate: 100,
      is_active: true,
      payout_status: 'not_connected',
      payout_setup_sent_at: '2026-11-17T00:00:00Z',
    });
    await ctx.service.assign(OWNER, EVENT, {
      guards: [guard('Ray Cole', '6015550199')],
      pay: PAY,
    });
    expect(ctx.db.rows('staff_members')).toHaveLength(1);
    expect(ctx.db.rows('staff_shifts')[0]).toMatchObject({
      pay_type: 'hourly',
      rate: 25,
    });
    expect(ctx.payouts.sendSetupLink).not.toHaveBeenCalled();
  });

  it('keeps the guard on the event and says why when pay cannot be set up', async () => {
    const ctx = setup();
    ctx.db.rows('staff_members').push({
      id: randomUUID(),
      owner_id: OWNER,
      name: 'Ray Cole',
      phone: '+16015550199',
      default_pay_type: 'hourly',
      default_rate: 20,
      is_active: false,
      payout_status: 'ready',
    });
    const out: any = await ctx.service.assign(OWNER, EVENT, {
      guards: [guard('Ray Cole', '6015550199')],
      pay: PAY,
    });
    expect(out.guards[0].paid).toBe(false);
    expect(out.guards[0].pay_error).toContain('inactive');
    expect(
      ctx.db
        .rows('security')
        .some((r) => r.phone === '+16015550199' && r.event_id === EVENT),
    ).toBe(true);
  });

  it('rejects a missing or silly rate', async () => {
    const { service } = setup();
    await expect(
      service.assign(OWNER, EVENT, {
        guards: [guard('Ray', '6015550199')],
        pay: { pay_type: 'hourly', rate: 0 },
      }),
    ).rejects.toThrow('more than $0');
    await expect(
      service.assign(OWNER, EVENT, {
        guards: [guard('Ray', '6015550199')],
        pay: { pay_type: 'weekly', rate: 10 },
      }),
    ).rejects.toThrow('hourly or flat');
  });

  it("starts the guard's hours when they tap arrive, and ends them when they leave", async () => {
    const { service, db, row } = await paidGuard();
    const at = NOW;
    expect((await service.publicView(row.check_in_token)) as any).toMatchObject(
      { paid: true, arrived: false, left: false },
    );
    jest.useFakeTimers({ now: at, doNotFake: ['nextTick', 'setImmediate'] });
    const arrived: any = await service.publicArrive(row.check_in_token, at);
    expect(arrived.arrived).toBe(true);
    expect(db.rows('staff_shifts')[0].status).toBe('clocked_in');
    const left: any = await service.publicLeave(
      row.check_in_token,
      at + 6 * 3600_000,
    );
    expect(left).toMatchObject({ left: true, arrived: true });
    expect(db.rows('staff_shifts')[0].status).toBe('submitted');
    expect(
      (
        (await service.publicLeave(
          row.check_in_token,
          at + 7 * 3600_000,
        )) as any
      ).left,
    ).toBe(true);
  });

  it('will not clock a guard out before they arrive, or one who is not set up for pay', async () => {
    const { service, row } = await paidGuard();
    await expect(service.publicLeave(row.check_in_token)).rejects.toThrow(
      'Check in before',
    );
    const plain = setup();
    await plain.service.assign(OWNER, EVENT, {
      guards: [guard('Sam', '6015550177')],
    });
    const p = plain.db
      .rows('security')
      .find((r) => r.phone === '+16015550177')!;
    await expect(plain.service.publicLeave(p.check_in_token)).rejects.toThrow(
      'not set up for pay',
    );
  });

  it('starts hours when the manager marks arrival, and rewinds them if undone', async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    const { service, db, row } = await paidGuard();
    await service.setArrival(OWNER, row.id, true);
    expect(db.rows('staff_shifts')[0].status).toBe('clocked_in');
    await service.setArrival(OWNER, row.id, false);
    expect(db.rows('staff_shifts')[0]).toMatchObject({
      status: 'scheduled',
      clock_in_at: null,
    });
  });

  it('will not undo arrival once the hours are in Staff Pay', async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    const { service, db, row } = await paidGuard();
    await service.publicArrive(row.check_in_token, NOW);
    await service.publicLeave(row.check_in_token, NOW + 3600_000);
    await expect(service.setArrival(OWNER, row.id, false)).rejects.toThrow(
      'already in Staff Pay',
    );
    expect(
      db.rows('security').find((r) => r.id === row.id)!.arrival_time,
    ).toBeTruthy();
  });

  it('cancels an unstarted shift when the guard is removed, but protects submitted and approved hours', async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    const a = await paidGuard();
    await a.service.remove(OWNER, a.row.id);
    expect(a.db.rows('staff_shifts')[0].status).toBe('cancelled');
    expect(a.db.rows('security').some((r) => r.id === a.row.id)).toBe(false);

    const b = await paidGuard();
    await b.service.publicArrive(b.row.check_in_token, NOW);
    await b.service.publicLeave(b.row.check_in_token, NOW + 3600_000);
    await expect(b.service.remove(OWNER, b.row.id)).rejects.toThrow(
      'waiting for your approval',
    );
    b.db.rows('staff_shifts')[0].status = 'approved';
    await b.service.remove(OWNER, b.row.id);
    expect(b.db.rows('staff_shifts')[0].status).toBe('approved');
    await expect(b.service.remove(OTHER, b.row.id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("shows each guard's pay status on the event list", async () => {
    const { service } = await paidGuard();
    const { guards } = (await service.list(OWNER, EVENT)) as any;
    const g = guards.find((x: any) => x.phone === '+16015550199');
    expect(g.shift).toMatchObject({
      status: 'scheduled',
      pay_type: 'hourly',
      rate: 25,
    });
  });
});
