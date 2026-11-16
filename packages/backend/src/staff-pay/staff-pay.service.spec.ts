import { randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FakeDb } from '../vendor-invoices/test-support/fake-db';
import { StaffPayService } from './staff-pay.service';

const OWNER = 'owner-1';
const OTHER = 'owner-2';
const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const UUID_X = '33333333-3333-4333-8333-333333333333';
const EVENT = '44444444-4444-4444-8444-444444444444';

function setup() {
  const db = new FakeDb({
    staff_members: [
      {
        id: UUID_A,
        owner_id: OWNER,
        name: 'Dee Booker',
        phone: '+16015550101',
        job_title: 'Bartender',
        default_pay_type: 'hourly',
        default_rate: 20,
        is_active: true,
      },
      {
        id: UUID_B,
        owner_id: OWNER,
        name: 'Sam Lee',
        phone: '+16015550102',
        job_title: 'Setup',
        default_pay_type: 'flat',
        default_rate: 100,
        is_active: true,
      },
      {
        id: UUID_X,
        owner_id: OTHER,
        name: 'Not Mine',
        phone: '+16015550199',
        default_pay_type: 'hourly',
        default_rate: 10,
        is_active: true,
      },
    ],
    staff_shifts: [],
    events: [{ id: EVENT, owner_id: OWNER, name: 'Gala', date: '2026-12-01' }],
  });
  db.nextId = () => randomUUID();
  const sms = { sendOne: jest.fn().mockResolvedValue(true) };
  const service = new StaffPayService(
    { getAdminClient: () => db } as any,
    { get: () => 'https://www.eventecos.com' } as any,
    sms as any,
  );
  return { db, sms, service };
}

const NOW = Date.parse('2026-12-01T22:00:00Z');

async function scheduled(
  service: StaffPayService,
  extra: Record<string, unknown> = {},
) {
  const [shift] = (await service.createShifts(OWNER, {
    staff_member_ids: [UUID_A],
    title: 'Bar',
    shift_date: '2026-12-01',
    start_time: '17:00',
    event_id: EVENT,
    ...extra,
  })) as any[];
  return shift;
}

describe('scheduling shifts', () => {
  it("uses each worker's default pay unless the shift sets its own, and texts the link", async () => {
    const { service, sms } = setup();
    const shifts = (await service.createShifts(OWNER, {
      staff_member_ids: [UUID_A, UUID_B],
      title: 'Gala night',
      shift_date: '2026-12-01',
      event_id: EVENT,
    })) as any[];
    expect(shifts.map((s) => [s.pay_type, s.rate])).toEqual([
      ['hourly', 20],
      ['flat', 100],
    ]);
    expect(shifts.every((s) => s.texted)).toBe(true);
    const [to, body] = sms.sendOne.mock.calls[0];
    expect(to).toBe('+16015550101');
    expect(body).toContain('Gala');
    expect(body).toContain(
      `https://www.eventecos.com/clock/${shifts[0].clock_token}`,
    );
    expect(shifts[0].clock_token).toMatch(/^[0-9a-f]{32}$/);
    expect(shifts[0].clock_token).not.toBe(shifts[1].clock_token);
  });

  it('lets one shift override pay type and rate', async () => {
    const { service } = setup();
    const s = await scheduled(service, { pay_type: 'flat', rate: 75 });
    expect([s.pay_type, s.rate]).toEqual(['flat', 75]);
  });

  it('can skip the text', async () => {
    const { service, sms } = setup();
    await scheduled(service, { send_link: false });
    expect(sms.sendOne).not.toHaveBeenCalled();
  });

  it("never schedules another venue's worker or event", async () => {
    const { service } = setup();
    await expect(
      service.createShifts(OWNER, {
        staff_member_ids: [UUID_X],
        title: 'x',
        shift_date: '2026-12-01',
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.createShifts(OTHER, {
        staff_member_ids: [UUID_A],
        title: 'x',
        shift_date: '2026-12-01',
      }),
    ).rejects.toThrow(NotFoundException);
    await expect(
      service.createShifts(OTHER, {
        staff_member_ids: [UUID_X],
        title: 'x',
        shift_date: '2026-12-01',
        event_id: EVENT,
      }),
    ).rejects.toThrow('Event not found');
  });

  it('refuses inactive workers and empty crews', async () => {
    const { service, db } = setup();
    db.rows('staff_members')[0].is_active = false;
    await expect(scheduled(service)).rejects.toThrow('inactive');
    await expect(
      service.createShifts(OWNER, {
        staff_member_ids: [],
        title: 'x',
        shift_date: '2026-12-01',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('the worker clock page', () => {
  it('shows the shift without pay or phone numbers', async () => {
    const { service } = setup();
    const s = await scheduled(service);
    const view: any = await service.publicView(s.clock_token);
    expect(view).toMatchObject({
      worker_first_name: 'Dee',
      title: 'Bar',
      event_name: 'Gala',
      status: 'scheduled',
    });
    expect(JSON.stringify(view)).not.toMatch(/rate|phone|owner_id|clock_token/);
  });

  it('rejects links that are not real tokens', async () => {
    const { service } = setup();
    await expect(service.publicView('abc')).rejects.toThrow(NotFoundException);
    await expect(service.clockIn('0'.repeat(32))).rejects.toThrow(
      NotFoundException,
    );
  });

  it('clocks in once and out once, ignoring double taps', async () => {
    const { service, db } = setup();
    const s = await scheduled(service);
    const inAt = Date.parse('2026-12-01T22:00:00Z');
    const a: any = await service.clockIn(s.clock_token, inAt);
    expect(a.status).toBe('clocked_in');
    const again: any = await service.clockIn(s.clock_token, inAt + 60000);
    expect(again.clock_in_at).toBe(a.clock_in_at);

    const outAt = Date.parse('2026-12-02T03:30:00Z');
    const out: any = await service.clockOut(s.clock_token, outAt);
    expect(out.status).toBe('submitted');
    const outAgain: any = await service.clockOut(s.clock_token, outAt + 600000);
    expect(outAgain.clock_out_at).toBe(out.clock_out_at);
    expect(db.rows('staff_shifts')[0].status).toBe('submitted');
  });

  it('will not clock out before clocking in, or clock in far from the shift date', async () => {
    const { service } = setup();
    const s = await scheduled(service);
    await expect(service.clockOut(s.clock_token, NOW)).rejects.toThrow(
      'Clock in before',
    );
    await expect(
      service.clockIn(s.clock_token, Date.parse('2026-12-10T12:00:00Z')),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses a cancelled shift', async () => {
    const { service } = setup();
    const s = await scheduled(service);
    await service.cancelShift(OWNER, s.id);
    await expect(service.clockIn(s.clock_token, NOW)).rejects.toThrow(
      'cancelled',
    );
  });
});

describe('approving hours', () => {
  async function submitted(service: StaffPayService, hours = 5.5) {
    const s = await scheduled(service);
    const start = Date.parse('2026-12-01T22:00:00Z');
    await service.clockIn(s.clock_token, start);
    await service.clockOut(s.clock_token, start + hours * 3600000);
    return s;
  }

  it('pays rate x worked hours', async () => {
    const { service } = setup();
    const s = await submitted(service);
    const done: any = await service.approveShift(OWNER, 'mgr', s.id, {});
    expect(done).toMatchObject({
      status: 'approved',
      approved_minutes: 330,
      approved_amount: 110,
    });
  });

  it('lets the manager correct the hours first', async () => {
    const { service } = setup();
    const s = await submitted(service);
    const done: any = await service.approveShift(OWNER, 'mgr', s.id, {
      minutes: 240,
    });
    expect(done.approved_amount).toBe(80);
  });

  it('makes the manager confirm hours on a shift that ran over 16 hours', async () => {
    const { service } = setup();
    const s = await submitted(service, 20);
    await expect(service.approveShift(OWNER, 'mgr', s.id, {})).rejects.toThrow(
      '16 hours',
    );
    const done: any = await service.approveShift(OWNER, 'mgr', s.id, {
      minutes: 360,
    });
    expect(done.approved_amount).toBe(120);
  });

  it('approves a flat shift without a clock, paying the flat fee', async () => {
    const { service } = setup();
    const [s] = (await service.createShifts(OWNER, {
      staff_member_ids: [UUID_B],
      title: 'Setup',
      shift_date: '2026-12-01',
    })) as any[];
    const done: any = await service.approveShift(OWNER, 'mgr', s.id, {});
    expect(done).toMatchObject({ status: 'approved', approved_amount: 100 });
  });

  it('will not approve an hourly shift that was never clocked', async () => {
    const { service } = setup();
    const s = await scheduled(service);
    await expect(service.approveShift(OWNER, 'mgr', s.id, {})).rejects.toThrow(
      ConflictException,
    );
  });

  it('cannot be approved twice', async () => {
    const { service } = setup();
    const s = await submitted(service);
    await service.approveShift(OWNER, 'mgr', s.id, {});
    await expect(service.approveShift(OWNER, 'mgr', s.id, {})).rejects.toThrow(
      'already approved',
    );
  });

  it('keeps approved shifts as history and locks edits', async () => {
    const { service } = setup();
    const s = await submitted(service);
    await service.approveShift(OWNER, 'mgr', s.id, {});
    await expect(service.cancelShift(OWNER, s.id)).rejects.toThrow(
      ConflictException,
    );
    await expect(
      service.updateShift(OWNER, s.id, { rate: 99 }),
    ).rejects.toThrow(ConflictException);
  });

  it('is private to the venue that owns the shift', async () => {
    const { service } = setup();
    const s = await submitted(service);
    await expect(service.approveShift(OTHER, 'x', s.id, {})).rejects.toThrow(
      NotFoundException,
    );
    await expect(service.cancelShift(OTHER, s.id)).rejects.toThrow(
      NotFoundException,
    );
    expect(await service.listShifts(OTHER, {})).toEqual([]);
  });
});

describe('roster and export', () => {
  it('normalises the phone when adding someone to the roster', async () => {
    const { service } = setup();
    const created = await service.createMember(OWNER, {
      name: 'New',
      phone: '601-555-0150',
      default_rate: 18,
    });
    expect(created.phone).toBe('+16015550150');
  });

  it('lists year-to-date earnings from approved shifts only', async () => {
    jest.useFakeTimers({ now: NOW, doNotFake: ['nextTick', 'setImmediate'] });
    const { service } = setup();
    const s = await scheduled(service);
    const start = Date.parse('2026-12-01T22:00:00Z');
    await service.clockIn(s.clock_token, start);
    await service.clockOut(s.clock_token, start + 2 * 3600000);
    const before: any[] = await service.listMembers(OWNER);
    expect(before.find((m) => m.id === UUID_A).ytd_earned).toBe(0);
    await service.approveShift(OWNER, 'mgr', s.id, {});
    const after: any[] = await service.listMembers(OWNER);
    const dee = after.find((m) => m.id === UUID_A);
    expect(dee.ytd_earned).toBe(40);
    jest.useRealTimers();
  });

  it('exports approved shifts only, with a header and safe cells', async () => {
    const { service, db } = setup();
    const a = await scheduled(service, { title: '=HYPERLINK("x")' });
    await scheduled(service, { title: 'Not yet approved' });
    const start = Date.parse('2026-12-01T22:00:00Z');
    await service.clockIn(a.clock_token, start);
    await service.clockOut(a.clock_token, start + 3 * 3600000);
    await service.approveShift(OWNER, 'mgr', a.id, {});
    const csv = await service.exportCsv(OWNER, '2026-12-01', '2026-12-31');
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe(
      'Worker,Phone,Job title,Date,Event,Shift,Pay type,Rate,Hours,Amount,Status',
    );
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("'=HYPERLINK");
    expect(lines[1]).toContain(
      'Dee Booker,+16015550101,Bartender,2026-12-01,Gala',
    );
    expect(lines[1]).toContain(',3.00,60.00,approved');
    expect(db.rows('staff_shifts')).toHaveLength(2);
  });
});
