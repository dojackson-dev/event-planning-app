import { Test, TestingModule } from '@nestjs/testing';
import { ClientPortalService } from './client-portal.service';
import { SupabaseService } from '../supabase/supabase.service';
import { StripeService } from '../stripe/stripe.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

/** Builds a chainable Supabase mock for common .from().select()... patterns. */
function makeChain(overrides: Record<string, jest.Mock> = {}): any {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    ...overrides,
  };
  // make from() return the chain itself
  chain.from = jest.fn().mockReturnValue(chain);
  return chain;
}

describe('ClientPortalService – confirmInvite', () => {
  let service: ClientPortalService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let adminClient: ReturnType<typeof makeChain>;

  beforeEach(async () => {
    adminClient = makeChain();

    supabaseService = {
      getAdminClient: jest.fn().mockReturnValue(adminClient),
      getClient: jest.fn(),
      setAuthContext: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientPortalService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: StripeService, useValue: {} },
        { provide: SmsNotificationsService, useValue: { sendSms: jest.fn() } },
      ],
    }).compile();

    service = module.get<ClientPortalService>(ClientPortalService);
  });

  afterEach(() => jest.clearAllMocks());

  // Helper: set up the chain so confirmInvite succeeds end-to-end and captures
  // the eventData passed to .insert()
  function setupConfirmInviteScenario(formOverrides: Partial<Record<string, any>> = {}) {
    const form = {
      id: 'form-1',
      invite_token: 'tok-abc',
      invite_status: 'sent',
      contact_phone: '+15550001111',
      contact_name: 'Alice',
      user_id: 'owner-1',
      event_type: 'birthday_party',
      event_date: '2026-10-15',
      event_time: '17:00',
      event_end_time: '21:00',
      event_description: 'A surprise party',
      special_requests: 'No peanuts',
      guest_count: 50,
      venue_preference: 'Grand Hall',
      ...formOverrides,
    };

    const capturedInserts: any[] = [];

    // Wire up sequential calls on the same chain
    let callIdx = 0;
    adminClient.from = jest.fn().mockImplementation((table: string) => {
      const sub: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        insert: jest.fn().mockImplementation((rows: any[]) => {
          capturedInserts.push({ table, rows });
          return {
            select: () => ({ single: () => Promise.resolve({ data: { id: 'event-1', ...rows[0] }, error: null }) }),
          };
        }),
        order: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
      };

      // intake_forms → return the form
      if (table === 'intake_forms') {
        sub.maybeSingle = jest.fn().mockImplementation(() => {
          callIdx++;
          if (callIdx === 1) return Promise.resolve({ data: form, error: null });
          // update call
          return Promise.resolve({ data: form, error: null });
        });
        sub.single = jest.fn().mockResolvedValue({ data: form, error: null });
      }

      // event → no existing event (so the else branch runs and inserts)
      if (table === 'event') {
        sub.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
        sub.single = jest.fn().mockResolvedValue({ data: null, error: null });
      }

      // notifications → success
      if (table === 'notifications') {
        sub.insert = jest.fn().mockReturnValue({
          select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }),
        });
        // override insert to capture
        sub.insert = jest.fn().mockImplementation((rows: any) => {
          capturedInserts.push({ table, rows });
          return Promise.resolve({ data: {}, error: null });
        });
      }

      return sub;
    });

    return { form, capturedInserts };
  }

  // ── event_end_time ────────────────────────────────────────────────────────

  it('uses form.event_end_time for event end_time when creating a new event', async () => {
    const { capturedInserts } = setupConfirmInviteScenario({ event_end_time: '21:30' });

    await service.confirmInvite('tok-abc', '+15550001111', 'client-1');

    const eventInsert = capturedInserts.find(c => c.table === 'event');
    expect(eventInsert).toBeDefined();
    expect(eventInsert.rows[0]).toHaveProperty('end_time', '21:30');
  });

  it('falls back to 23:59 when event_end_time is null', async () => {
    const { capturedInserts } = setupConfirmInviteScenario({ event_end_time: null });

    await service.confirmInvite('tok-abc', '+15550001111', 'client-1');

    const eventInsert = capturedInserts.find(c => c.table === 'event');
    expect(eventInsert?.rows[0]).toHaveProperty('end_time', '23:59');
  });

  // ── event_description ─────────────────────────────────────────────────────

  it('uses event_description for event description when present', async () => {
    const { capturedInserts } = setupConfirmInviteScenario({
      event_description: 'Garden birthday party',
      special_requests: 'No balloons',
    });

    await service.confirmInvite('tok-abc', '+15550001111', 'client-1');

    const eventInsert = capturedInserts.find(c => c.table === 'event');
    expect(eventInsert?.rows[0]).toHaveProperty('description', 'Garden birthday party');
  });

  it('falls back to special_requests when event_description is null', async () => {
    const { capturedInserts } = setupConfirmInviteScenario({
      event_description: null,
      special_requests: 'Vegan menu only',
    });

    await service.confirmInvite('tok-abc', '+15550001111', 'client-1');

    const eventInsert = capturedInserts.find(c => c.table === 'event');
    expect(eventInsert?.rows[0]).toHaveProperty('description', 'Vegan menu only');
  });

  it('sets empty string description when both event_description and special_requests are null', async () => {
    const { capturedInserts } = setupConfirmInviteScenario({
      event_description: null,
      special_requests: null,
    });

    await service.confirmInvite('tok-abc', '+15550001111', 'client-1');

    const eventInsert = capturedInserts.find(c => c.table === 'event');
    expect(eventInsert?.rows[0]).toHaveProperty('description', '');
  });

  // ── Guard: phone mismatch ─────────────────────────────────────────────────

  it('throws BadRequestException when client phone does not match form', async () => {
    setupConfirmInviteScenario({ contact_phone: '+15559999999' });

    await expect(
      service.confirmInvite('tok-abc', '+15550001111', 'client-1'),
    ).rejects.toThrow(BadRequestException);
  });

  // ── Guard: already confirmed ───────────────────────────────────────────────

  it('throws BadRequestException when invite is already confirmed', async () => {
    setupConfirmInviteScenario({ invite_status: 'confirmed' });

    await expect(
      service.confirmInvite('tok-abc', '+15550001111', 'client-1'),
    ).rejects.toThrow(BadRequestException);
  });

  // ── No form found ──────────────────────────────────────────────────────────

  it('throws NotFoundException when invite token is not found', async () => {
    adminClient.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await expect(
      service.confirmInvite('bad-token', '+15550001111', 'client-1'),
    ).rejects.toThrow(NotFoundException);
  });
});
