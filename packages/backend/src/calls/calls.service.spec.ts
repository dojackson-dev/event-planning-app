/* eslint-disable @typescript-eslint/require-await */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { CallIdentity, CallsService } from './calls.service';

type Row = Record<string, any>;

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const REP_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_REP_ID = '33333333-3333-4333-8333-333333333333';
const AFFILIATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_AFFILIATE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LEAD_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const CLIENT_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const BUSINESS_NUMBER = '+18782060675';

const admin: CallIdentity = {
  userId: ADMIN_ID,
  email: 'admin@eventecos.com',
  kind: 'admin',
  name: 'EventEcos Admin',
  isManager: true,
};
const rep: CallIdentity = {
  userId: REP_ID,
  email: 'rep@eventecos.com',
  kind: 'sales',
  name: 'Pat Rep',
  affiliateId: AFFILIATE_ID,
  isManager: false,
};

/** A tiny in-memory stand-in for the Supabase query builder. */
class FakeDb {
  tables: Record<string, Row[]> = {};
  uniqueViolation: (table: string, row: Row, rows: Row[]) => boolean = () =>
    false;
  private seq = 0;

  from(table: string) {
    this.tables[table] ??= [];
    return new FakeQuery(this, table);
  }
  nextId() {
    this.seq += 1;
    return `00000000-0000-4000-8000-${String(this.seq).padStart(12, '0')}`;
  }
}

class FakeQuery {
  private filters: Array<(r: Row) => boolean> = [];
  private op: 'select' | 'insert' | 'update' | 'upsert' = 'select';
  private payload: Row = {};
  private countOnly = false;
  private wantRows = false;

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op === 'select') {
      this.countOnly = !!opts?.head;
    } else {
      this.wantRows = true;
    }
    return this;
  }
  insert(row: Row) {
    this.op = 'insert';
    this.payload = row;
    return this;
  }
  update(patch: Row) {
    this.op = 'update';
    this.payload = patch;
    return this;
  }
  upsert(row: Row) {
    this.op = 'upsert';
    this.payload = row;
    return this;
  }
  eq(col: string, val: unknown) {
    this.filters.push((r) => r[col] === val);
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push((r) => vals.includes(r[col]));
    return this;
  }
  is(col: string, val: unknown) {
    this.filters.push((r) => (r[col] ?? null) === val);
    return this;
  }
  not(col: string, _op: string, val: unknown) {
    this.filters.push((r) => (r[col] ?? null) !== val);
    return this;
  }
  gte(col: string, val: string) {
    this.filters.push((r) => String(r[col]) >= val);
    return this;
  }
  lt(col: string, val: string) {
    this.filters.push((r) => String(r[col]) < val);
    return this;
  }
  or() {
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }
  single() {
    return this.run(true);
  }
  maybeSingle() {
    return this.run(true);
  }
  then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
    return this.run(false).then(resolve, reject);
  }

  private async run(single: boolean): Promise<Row> {
    const rows = this.db.tables[this.table];
    const matches = () => rows.filter((r) => this.filters.every((f) => f(r)));

    if (this.op === 'insert' || this.op === 'upsert') {
      const row = {
        id: this.payload.id ?? this.db.nextId(),
        created_at: new Date().toISOString(),
        ...this.payload,
      };
      if (this.op === 'upsert') {
        const key = 'user_id' in row ? 'user_id' : 'id';
        const i = rows.findIndex((r) => r[key] === row[key]);
        if (i >= 0) rows[i] = { ...rows[i], ...row };
        else rows.push(row);
        return { data: row, error: null };
      }
      if (this.db.uniqueViolation(this.table, row, rows)) {
        return { data: null, error: { code: '23505', message: 'duplicate' } };
      }
      rows.push(row);
      return { data: single ? row : [row], error: null };
    }
    if (this.op === 'update') {
      const hit = matches();
      hit.forEach((r) => Object.assign(r, this.payload));
      return { data: this.wantRows ? hit : null, error: null };
    }
    const hit = matches();
    if (this.countOnly) return { data: null, count: hit.length, error: null };
    return single
      ? { data: hit[0] ?? null, error: null }
      : { data: hit, error: null };
  }
}

function setup(opts: { configured?: boolean } = {}) {
  const db = new FakeDb();
  const twilioService = {
    getBusinessNumber: () => BUSINESS_NUMBER,
    createCall: jest.fn().mockResolvedValue({ sid: 'CA_staff_1' }),
    sendSMS: jest.fn().mockResolvedValue({ sid: 'SM1', status: 'queued' }),
    fetchRecordingAudio: jest.fn(),
  };
  const config = {
    get: (key: string) =>
      key === 'API_PUBLIC_URL' && opts.configured !== false
        ? 'https://api.example.test'
        : key === 'TWILIO_AUTH_TOKEN'
          ? 'token'
          : undefined,
  };
  const service = new CallsService(
    { getAdminClient: () => db } as any,
    config as any,
    twilioService as any,
  );
  return { db, service, twilioService };
}

function seedRep(db: FakeDb, overrides: Row = {}, userId = REP_ID) {
  db.tables.call_staff = [
    ...(db.tables.call_staff ?? []),
    {
      user_id: userId,
      kind: 'sales',
      display_name: 'Pat Rep',
      calling_enabled: true,
      receives_inbound: false,
      mobile_e164: '+15045550111',
      mobile_verified_at: '2026-11-01T00:00:00Z',
      ...overrides,
    },
  ];
}

function seedLead(db: FakeDb, claimedBy: string | null = AFFILIATE_ID) {
  db.tables.demo_requests = [
    {
      id: LEAD_ID,
      name: 'Venue Lead',
      phone: '(601) 555-0100',
      claimed_by_affiliate_id: claimedBy,
    },
  ];
}

const ONE_PENDING_PER_STAFF = (table: string, row: Row, rows: Row[]) =>
  table === 'call_logs' &&
  row.direction === 'outbound' &&
  rows.some(
    (r) =>
      r.staff_user_id === row.staff_user_id &&
      r.direction === 'outbound' &&
      ['initiated', 'staff_ringing', 'client_ringing'].includes(r.status),
  );

describe('CallsService outbound', () => {
  it('rings the staff member first, never the client, and takes the number from the saved lead', async () => {
    const { db, service, twilioService } = setup();
    seedRep(db);
    seedLead(db);

    const result = await service.startOutbound(rep, {
      source: 'lead',
      id: LEAD_ID,
      // a client-supplied number must be ignored
      phone: '+19999999999',
    } as any);

    expect(result.status).toBe('initiated');
    expect(twilioService.createCall).toHaveBeenCalledTimes(1);
    const call = twilioService.createCall.mock.calls[0][0];
    expect(call.to).toBe('+15045550111');
    expect(call.url).toContain('/calls/hook/staff-gather?logId=');
    const log = db.tables.call_logs[0];
    expect(log).toMatchObject({
      direction: 'outbound',
      staff_user_id: REP_ID,
      client_phone: '+16015550100',
      client_name: 'Venue Lead',
      status: 'initiated',
      staff_call_sid: 'CA_staff_1',
    });
  });

  it('refuses staff who are not switched on', async () => {
    const { db, service, twilioService } = setup();
    seedRep(db, { calling_enabled: false });
    seedLead(db);
    await expect(
      service.startOutbound(rep, { source: 'lead', id: LEAD_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(twilioService.createCall).not.toHaveBeenCalled();
  });

  it('requires a verified cell phone', async () => {
    const { db, service } = setup();
    seedRep(db, { mobile_verified_at: null });
    seedLead(db);
    await expect(
      service.startOutbound(rep, { source: 'lead', id: LEAD_ID }),
    ).rejects.toMatchObject({ response: { code: 'MOBILE_NOT_VERIFIED' } });
  });

  it('only lets a rep call leads they claimed, and only admins call clients', async () => {
    const { db, service, twilioService } = setup();
    seedRep(db);
    seedLead(db, OTHER_AFFILIATE_ID);
    await expect(
      service.startOutbound(rep, { source: 'lead', id: LEAD_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.startOutbound(rep, { source: 'client', id: CLIENT_ID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(twilioService.createCall).not.toHaveBeenCalled();
  });

  it('lets the admin call a client from the saved record', async () => {
    const { db, service, twilioService } = setup();
    seedRep(db, { kind: 'admin' }, ADMIN_ID);
    db.tables.intake_forms = [
      {
        id: CLIENT_ID,
        contact_name: 'Shelton Chamber',
        contact_phone: '601-218-3374',
      },
    ];
    await service.startOutbound(admin, { source: 'client', id: CLIENT_ID });
    expect(db.tables.call_logs[0].client_phone).toBe('+16012183374');
    expect(twilioService.createCall.mock.calls[0][0].to).toBe('+15045550111');
  });

  it('blocks destinations outside the allowed regions', async () => {
    const { db, service, twilioService } = setup();
    seedRep(db);
    db.tables.demo_requests = [
      {
        id: LEAD_ID,
        name: 'Abroad',
        phone: '+442079460958',
        claimed_by_affiliate_id: AFFILIATE_ID,
      },
    ];
    await expect(
      service.startOutbound(rep, { source: 'lead', id: LEAD_ID }),
    ).rejects.toMatchObject({ response: { code: 'DESTINATION_NOT_ALLOWED' } });
    expect(twilioService.createCall).not.toHaveBeenCalled();
  });

  it('stops a second call while one is still being set up (duplicate click)', async () => {
    const { db, service, twilioService } = setup();
    db.uniqueViolation = ONE_PENDING_PER_STAFF;
    seedRep(db);
    seedLead(db);
    await service.startOutbound(rep, { source: 'lead', id: LEAD_ID });
    await expect(
      service.startOutbound(rep, { source: 'lead', id: LEAD_ID }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(twilioService.createCall).toHaveBeenCalledTimes(1);
  });

  it('enforces the hourly limit', async () => {
    const { db, service, twilioService } = setup();
    seedRep(db);
    seedLead(db);
    db.tables.call_settings = [{ id: 1, max_calls_per_hour: 2 }];
    const recent = new Date().toISOString();
    db.tables.call_logs = [1, 2].map((n) => ({
      id: `l${n}`,
      direction: 'outbound',
      staff_user_id: REP_ID,
      client_phone: `+1601555020${n}`,
      status: 'completed',
      created_at: recent,
    }));
    const err: any = await service
      .startOutbound(rep, { source: 'lead', id: LEAD_ID })
      .catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    expect(twilioService.createCall).not.toHaveBeenCalled();
  });

  it('marks the call failed when Twilio cannot start it', async () => {
    const { db, service, twilioService } = setup();
    seedRep(db);
    seedLead(db);
    twilioService.createCall.mockRejectedValue(new Error('boom'));
    await expect(
      service.startOutbound(rep, { source: 'lead', id: LEAD_ID }),
    ).rejects.toBeInstanceOf(HttpException);
    expect(db.tables.call_logs[0].status).toBe('failed');
  });

  it('is unavailable until the public API URL is configured', async () => {
    const { db, service } = setup({ configured: false });
    seedRep(db);
    seedLead(db);
    await expect(
      service.startOutbound(rep, { source: 'lead', id: LEAD_ID }),
    ).rejects.toMatchObject({ status: 503 });
  });

  it('allows different staff members to call at the same time', async () => {
    const { db, service, twilioService } = setup();
    db.uniqueViolation = ONE_PENDING_PER_STAFF;
    seedRep(db);
    seedRep(db, { mobile_e164: '+15045550222' }, OTHER_REP_ID);
    seedLead(db);
    const other: CallIdentity = {
      ...rep,
      userId: OTHER_REP_ID,
      affiliateId: AFFILIATE_ID,
    };
    await service.startOutbound(rep, { source: 'lead', id: LEAD_ID });
    await service.startOutbound(other, { source: 'lead', id: LEAD_ID });
    expect(twilioService.createCall).toHaveBeenCalledTimes(2);
  });
});

describe('CallsService staff confirmation', () => {
  async function started() {
    const ctx = setup();
    seedRep(ctx.db);
    seedLead(ctx.db);
    const { id } = await ctx.service.startOutbound(rep, {
      source: 'lead',
      id: LEAD_ID,
    });
    return { ...ctx, logId: id };
  }

  it('asks the staff member to press 1 and does not dial the client yet', async () => {
    const { service, logId } = await started();
    const xml = await service.staffGather(logId);
    expect(xml).toContain('<Gather');
    expect(xml).toContain('EventEcos call. Press 1 to connect.');
    expect(xml).not.toContain('<Dial');
    expect(xml).not.toContain('+16015550100');
  });

  it('dials the client from the saved number only after 1 is pressed, showing the EventEcos number', async () => {
    const { db, service, logId } = await started();
    const xml = await service.staffConfirm(logId, '1');
    expect(xml).toContain('<Dial');
    expect(xml).toContain(`callerId="${BUSINESS_NUMBER}"`);
    expect(xml).toContain('+16015550100');
    expect(db.tables.call_logs[0].status).toBe('client_ringing');
  });

  it('does not call the client when any other key (or nothing) is pressed', async () => {
    const { db, service, logId } = await started();
    for (const digit of ['2', undefined]) {
      const xml = await service.staffConfirm(logId, digit);
      expect(xml).not.toContain('<Dial');
    }
    expect(db.tables.call_logs[0].status).toBe('staff_declined');
  });

  it('does not dial twice if the confirmation arrives again', async () => {
    const { service, logId } = await started();
    await service.staffConfirm(logId, '1');
    const again = await service.staffConfirm(logId, '1');
    expect(again).not.toContain('<Dial');
  });

  it('records an unanswered staff phone and never calls the client', async () => {
    const { db, service, logId } = await started();
    await service.staffStatus(logId, { CallStatus: 'no-answer' });
    expect(db.tables.call_logs[0].status).toBe('staff_no_answer');
    expect(db.tables.call_logs[0].ended_at).toBeTruthy();
    // a late "completed" callback does not rewrite the result
    await service.staffStatus(logId, { CallStatus: 'completed' });
    expect(db.tables.call_logs[0].status).toBe('staff_no_answer');
    const xml = await service.staffConfirm(logId, '1');
    expect(xml).not.toContain('<Dial');
  });

  it('records a staff phone that answered but never confirmed (e.g. voicemail)', async () => {
    const { db, service, logId } = await started();
    await service.staffGather(logId);
    await service.staffStatus(logId, { CallStatus: 'completed' });
    expect(db.tables.call_logs[0].status).toBe('staff_declined');
  });

  it('records duration and completion from the client leg callbacks', async () => {
    const { db, service, logId } = await started();
    await service.staffConfirm(logId, '1');
    await service.clientStatus(logId, {
      CallStatus: 'in-progress',
      CallSid: 'CA_client_1',
    });
    expect(db.tables.call_logs[0]).toMatchObject({
      status: 'in_progress',
      client_call_sid: 'CA_client_1',
    });
    expect(db.tables.call_logs[0].answered_at).toBeTruthy();
    await service.clientStatus(logId, {
      CallStatus: 'completed',
      CallSid: 'CA_client_1',
      CallDuration: '125',
    });
    expect(db.tables.call_logs[0]).toMatchObject({
      status: 'completed',
      duration_seconds: 125,
    });
    // repeated or out-of-order callbacks change nothing
    await service.clientStatus(logId, {
      CallStatus: 'in-progress',
      CallSid: 'CA_client_1',
    });
    expect(db.tables.call_logs[0].status).toBe('completed');
  });

  it('records an unanswered client and tells the staff member', async () => {
    const { db, service, logId } = await started();
    await service.staffConfirm(logId, '1');
    const xml = await service.dialResult(logId, {
      DialCallStatus: 'no-answer',
    });
    expect(db.tables.call_logs[0].status).toBe('client_no_answer');
    expect(xml).toContain('did not answer');
  });
});

describe('CallsService notes and history', () => {
  it('lets a rep add notes only to their own calls', async () => {
    const { db, service } = setup();
    db.tables.call_logs = [
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000001',
        staff_user_id: REP_ID,
        client_phone: '+16015550100',
        status: 'completed',
        direction: 'outbound',
      },
      {
        id: 'aaaaaaaa-0000-4000-8000-000000000002',
        staff_user_id: OTHER_REP_ID,
        client_phone: '+16015550101',
        status: 'completed',
        direction: 'outbound',
      },
    ];
    const saved = await service.saveNotes(
      rep,
      'aaaaaaaa-0000-4000-8000-000000000001',
      { outcome: 'interested', notes: 'Wants a demo Friday' },
    );
    expect(saved).toMatchObject({
      outcome: 'interested',
      notes: 'Wants a demo Friday',
    });
    await expect(
      service.saveNotes(rep, 'aaaaaaaa-0000-4000-8000-000000000002', {
        notes: 'nope',
      }),
    ).rejects.toThrow('Call not found');
    await expect(
      service.saveNotes(rep, 'aaaaaaaa-0000-4000-8000-000000000001', {
        outcome: 'made_up',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CallsService incoming calls', () => {
  afterEach(() => jest.useRealTimers());

  const WEDNESDAY_10AM_CST = new Date('2026-11-04T16:00:00Z');
  const WEDNESDAY_9PM_CST = new Date('2026-11-05T03:00:00Z');

  function seedInboundStaff(db: FakeDb) {
    seedRep(db, { receives_inbound: true });
    seedRep(
      db,
      { receives_inbound: true, mobile_e164: '+15045550222' },
      OTHER_REP_ID,
    );
  }

  it('rings every designated staff member at once, each behind a press-1 screen', async () => {
    jest.useFakeTimers().setSystemTime(WEDNESDAY_10AM_CST);
    const { db, service } = setup();
    seedInboundStaff(db);
    const xml = await service.incoming({
      From: '+16015559999',
      CallSid: 'CA_in_1',
    });
    expect(xml).toContain('<Dial');
    expect(xml).toContain('+15045550111');
    expect(xml).toContain('+15045550222');
    expect(xml).toContain('/calls/hook/incoming-screen?');
    expect(db.tables.call_logs[0]).toMatchObject({
      direction: 'inbound',
      status: 'ringing',
    });
  });

  it('sends after-hours calls to shared voicemail', async () => {
    jest.useFakeTimers().setSystemTime(WEDNESDAY_9PM_CST);
    const { db, service } = setup();
    seedInboundStaff(db);
    const xml = await service.incoming({
      From: '+16015559999',
      CallSid: 'CA_in_2',
    });
    expect(xml).toContain('<Record');
    expect(xml).not.toContain('<Dial');
    expect(db.tables.call_logs[0].status).toBe('voicemail');
  });

  it('sends calls to voicemail when nobody is designated', async () => {
    jest.useFakeTimers().setSystemTime(WEDNESDAY_10AM_CST);
    const { service } = setup();
    const xml = await service.incoming({
      From: '+16015559999',
      CallSid: 'CA_in_3',
    });
    expect(xml).toContain('<Record');
  });

  it('only connects a staff member who presses 1, and only the first to do so', async () => {
    jest.useFakeTimers().setSystemTime(WEDNESDAY_10AM_CST);
    const { db, service } = setup();
    seedInboundStaff(db);
    await service.incoming({ From: '+16015559999', CallSid: 'CA_in_4' });
    const logId = db.tables.call_logs[0].id;

    const prompt = await service.incomingScreen(logId, REP_ID, undefined);
    expect(prompt).toContain('Press 1 to accept');

    const declined = await service.incomingScreen(logId, REP_ID, '2');
    expect(declined).toContain('<Hangup');
    expect(db.tables.call_logs[0].staff_user_id).toBeUndefined();

    const winner = await service.incomingScreen(logId, OTHER_REP_ID, '1');
    expect(winner).not.toContain('<Hangup');
    expect(db.tables.call_logs[0]).toMatchObject({
      staff_user_id: OTHER_REP_ID,
      status: 'in_progress',
    });

    const late = await service.incomingScreen(logId, REP_ID, '1');
    expect(late).toContain('Another teammate');
    expect(db.tables.call_logs[0].staff_user_id).toBe(OTHER_REP_ID);
  });

  it('goes to voicemail when nobody accepts, and completes when someone did', async () => {
    jest.useFakeTimers().setSystemTime(WEDNESDAY_10AM_CST);
    const { db, service } = setup();
    seedInboundStaff(db);
    await service.incoming({ From: '+16015559999', CallSid: 'CA_in_5' });
    const logId = db.tables.call_logs[0].id;
    const missed = await service.incomingResult(logId, {
      DialCallStatus: 'no-answer',
    });
    expect(missed).toContain('<Record');
    expect(db.tables.call_logs[0].status).toBe('voicemail');

    await service.incoming({ From: '+16015558888', CallSid: 'CA_in_6' });
    const second = db.tables.call_logs[1];
    await service.incomingScreen(second.id, REP_ID, '1');
    await service.incomingResult(second.id, {
      DialCallStatus: 'completed',
      DialCallDuration: '75',
    });
    expect(second).toMatchObject({ status: 'completed', duration_seconds: 75 });
  });

  it('keeps one record when Twilio repeats the incoming webhook', async () => {
    jest.useFakeTimers().setSystemTime(WEDNESDAY_10AM_CST);
    const { db, service } = setup();
    db.uniqueViolation = (table, row, rows) =>
      table === 'call_logs' &&
      !!row.client_call_sid &&
      rows.some((r) => r.client_call_sid === row.client_call_sid);
    seedInboundStaff(db);
    await service.incoming({ From: '+16015559999', CallSid: 'CA_in_7' });
    await service.incoming({ From: '+16015559999', CallSid: 'CA_in_7' });
    expect(db.tables.call_logs).toHaveLength(1);
  });

  it('saves voicemails only from Twilio-hosted recordings', async () => {
    const { db, service } = setup();
    await service.voicemailRecording('not-a-log', {
      RecordingSid: 'RE1',
      RecordingUrl: 'https://evil.example.com/rec',
    });
    expect(db.tables.call_voicemails ?? []).toHaveLength(0);
    await service.voicemailRecording('not-a-log', {
      RecordingSid: 'RE2',
      RecordingUrl:
        'https://api.twilio.com/2010-04-01/Accounts/AC1/Recordings/RE2',
      RecordingDuration: '14',
      From: '+16015559999',
    });
    expect(db.tables.call_voicemails).toHaveLength(1);
  });
});

describe('CallsService phone verification', () => {
  it('texts a code, accepts the right one, and then the number is verified', async () => {
    const { db, service, twilioService } = setup();
    await service.startMobileVerification(rep, '(504) 555-0111');
    const text: string = twilioService.sendSMS.mock.calls[0][1];
    const code = /code is (\d{6})/.exec(text)![1];
    expect(twilioService.sendSMS.mock.calls[0][0]).toBe('+15045550111');

    await expect(service.confirmMobile(rep, '000000')).rejects.toThrow(
      'not right',
    );
    const profile = await service.confirmMobile(rep, code);
    expect(profile.mobileVerified).toBe(true);
    expect(db.tables.call_staff[0].mobile_e164).toBe('+15045550111');
    expect(db.tables.call_staff[0].verify_code_hash).toBeNull();
  });

  it('removes the saved and pending number so calling stops until a new one is verified', async () => {
    const { db, service } = setup();
    seedRep(db, {
      pending_mobile_e164: '+15045550999',
      verify_code_hash: 'abc',
      receives_inbound: true,
    });
    const profile = await service.removeMobile(rep);
    seedLead(db, rep.affiliateId);
    expect(profile.mobileVerified).toBe(false);
    expect(profile.mobile).toBeNull();
    expect(profile.pendingMobile).toBeNull();
    expect(db.tables.call_staff[0]).toMatchObject({
      mobile_e164: null,
      mobile_verified_at: null,
      pending_mobile_e164: null,
      verify_code_hash: null,
    });
    await expect(
      service.startOutbound(rep, { source: 'lead', id: LEAD_ID }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('limits guesses and resends', async () => {
    const { service } = setup();
    await service.startMobileVerification(rep, '5045550111');
    await expect(
      service.startMobileVerification(rep, '5045550111'),
    ).rejects.toMatchObject({ status: 429 });
    for (let i = 0; i < 5; i++) {
      await service.confirmMobile(rep, '111111').catch(() => undefined);
    }
    await expect(service.confirmMobile(rep, '111111')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('rejects numbers that are not allowed or not valid', async () => {
    const { service } = setup();
    await expect(
      service.startMobileVerification(rep, 'abc'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.startMobileVerification(rep, '+442079460958'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('CallsService admin staff controls', () => {
  it('turns calling on for a sales rep, and incoming calls need a verified phone', async () => {
    const { db, service } = setup();
    db.tables.affiliates = [
      {
        user_id: REP_ID,
        first_name: 'Pat',
        last_name: 'Rep',
        email: 'rep@eventecos.com',
        status: 'active',
      },
    ];
    await service.updateStaff(REP_ID, { callingEnabled: true });
    expect(db.tables.call_staff[0]).toMatchObject({
      kind: 'sales',
      calling_enabled: true,
      receives_inbound: false,
    });
    await expect(
      service.updateStaff(REP_ID, { receivesInbound: true }),
    ).rejects.toBeInstanceOf(BadRequestException);

    db.tables.call_staff[0].mobile_verified_at = '2026-11-01T00:00:00Z';
    db.tables.call_staff[0].mobile_e164 = '+15045550111';
    await service.updateStaff(REP_ID, { receivesInbound: true });
    expect(db.tables.call_staff[0].receives_inbound).toBe(true);

    await service.updateStaff(REP_ID, { callingEnabled: false });
    expect(db.tables.call_staff[0].receives_inbound).toBe(false);
  });

  it('does not create staff records for unknown or inactive people', async () => {
    const { db, service } = setup();
    db.tables.affiliates = [
      { user_id: REP_ID, email: 'x@y.z', status: 'inactive' },
    ];
    await expect(
      service.updateStaff(REP_ID, { callingEnabled: true }),
    ).rejects.toThrow('Staff not found');
    await expect(
      service.updateStaff(OTHER_REP_ID, { callingEnabled: true }),
    ).rejects.toThrow('Staff not found');
  });

  it('validates settings before saving', async () => {
    const { service } = setup();
    await expect(
      service.saveSettings({ max_calls_per_hour: 0 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveSettings({ allowed_country_codes: ['usa'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const saved = await service.saveSettings({
      allowed_country_codes: ['+1', '+44'],
      max_calls_per_hour: 30,
    });
    expect(saved.allowed_country_codes).toEqual(['+1', '+44']);
    expect(saved.max_calls_per_hour).toBe(30);
  });
});
