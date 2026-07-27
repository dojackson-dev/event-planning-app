import { Test, TestingModule } from '@nestjs/testing';
import { IntakeFormsService } from './intake-forms.service';
import { SupabaseService } from '../supabase/supabase.service';
import { MailService } from '../mail/mail.service';
import { TwilioService } from '../messaging/twilio.service';
import { SmsNotificationsService } from '../messaging/sms-notifications.service';
import { EventsService } from '../events/events.service';

/** Build a minimal mock Supabase chain that resolves with `result`. */
function makeSupabaseMock(result: { data: any; error: any }) {
  const chain: any = {
    from: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(result),
    eq: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  };
  return chain;
}

describe('IntakeFormsService – createPublic', () => {
  let service: IntakeFormsService;
  let supabaseService: jest.Mocked<SupabaseService>;
  let adminClient: any;

  const ownerRow = {
    data: { primary_owner_id: 'owner-1' },
    error: null,
  };

  beforeEach(async () => {
    // Default: inserts succeed with a full form record
    adminClient = {
      from: jest.fn(),
    };

    supabaseService = {
      getAdminClient: jest.fn().mockReturnValue(adminClient),
      getClient: jest.fn(),
      setAuthContext: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntakeFormsService,
        { provide: SupabaseService, useValue: supabaseService },
        { provide: MailService, useValue: { sendClientInvitation: jest.fn().mockResolvedValue(undefined), sendNewLeadNotification: jest.fn().mockResolvedValue(undefined) } },
        { provide: TwilioService, useValue: { sendSMS: jest.fn().mockResolvedValue(undefined) } },
        { provide: SmsNotificationsService, useValue: { newIntakeFormSubmission: jest.fn().mockResolvedValue(undefined) } },
        { provide: EventsService, useValue: {} },
      ],
    }).compile();

    service = module.get<IntakeFormsService>(IntakeFormsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── event_description in payload ──────────────────────────────────────────

  it('includes event_description in the first insert attempt', async () => {
    const insertedRows: any[] = [];
    const mockChain = {
      insert: jest.fn().mockImplementation((rows: any[]) => {
        insertedRows.push(...rows);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'form-1', ...rows[0] }, error: null }),
          }),
        };
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    adminClient.from = jest.fn().mockReturnValue(mockChain);

    await service.createPublic('owner-1', {
      event_type: 'birthday_party',
      event_date: '2026-10-01',
      contact_name: 'Bob Jones',
      contact_email: 'bob@test.com',
      event_description: 'A surprise party for my wife',
    });

    expect(insertedRows[0]).toHaveProperty('event_description', 'A surprise party for my wife');
  });

  it('strips accessibility_requirements, preferred_contact, venue_id, and event_description from safeDto', async () => {
    const insertedRows: any[] = [];
    const mockChain = {
      insert: jest.fn().mockImplementation((rows: any[]) => {
        insertedRows.push(...rows);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'form-1', ...rows[0] }, error: null }),
          }),
        };
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    adminClient.from = jest.fn().mockReturnValue(mockChain);

    await service.createPublic('owner-1', {
      event_type: 'corporate_event',
      event_date: '2026-11-01',
      contact_name: 'Carla D',
      contact_email: 'carla@test.com',
      accessibility_requirements: 'wheelchair ramp',
      preferred_contact: 'email',
      venue_id: 'venue-abc',
      event_description: 'Annual summit',
    });

    // These fields should appear in the top-level insert via extras, not via safeDto spread
    expect(insertedRows[0]).not.toHaveProperty('accessibility_requirements');
    expect(insertedRows[0]).not.toHaveProperty('preferred_contact');
    // venue_id is included in extras, so it CAN appear — but only once via extras
    // event_description IS included via extras (not spread from safeDto)
    expect(insertedRows[0]).toHaveProperty('event_description', 'Annual summit');
    expect(insertedRows[0]).toHaveProperty('venue_id', 'venue-abc');
  });

  // ── Graceful fallback when column missing ─────────────────────────────────

  it('falls back to base payload when extras insert fails', async () => {
    let callCount = 0;
    const mockChain = {
      insert: jest.fn().mockImplementation((rows: any[]) => {
        callCount++;
        if (callCount === 1) {
          // First attempt (with event_description + venue_id) → column error
          return {
            select: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { message: 'column "event_description" of relation "intake_forms" does not exist', code: '42703' },
              }),
            }),
          };
        }
        // Second attempt (base payload) → success
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'form-2', ...rows[0] }, error: null }),
          }),
        };
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    adminClient.from = jest.fn().mockReturnValue(mockChain);

    const result = await service.createPublic('owner-1', {
      event_type: 'birthday_party',
      event_date: '2026-09-01',
      contact_name: 'Dave E',
      contact_email: 'dave@test.com',
      event_description: 'Surprise party',
    });

    expect(callCount).toBe(2);
    // Result should come from the second (fallback) insert
    expect(result).toMatchObject({ id: 'form-2' });
  });

  it('throws if both attempts fail', async () => {
    const mockChain = {
      insert: jest.fn().mockReturnValue({
        select: () => ({
          single: () => Promise.resolve({
            data: null,
            error: { message: 'connection refused' },
          }),
        }),
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    adminClient.from = jest.fn().mockReturnValue(mockChain);

    await expect(
      service.createPublic('owner-1', {
        event_type: 'birthday_party',
        event_date: '2026-09-01',
        contact_name: 'Eve F',
        contact_email: 'eve@test.com',
      }),
    ).rejects.toThrow('Public intake form insert failed');
  });

  it('omits event_description from extras when not provided', async () => {
    const insertedRows: any[] = [];
    const mockChain = {
      insert: jest.fn().mockImplementation((rows: any[]) => {
        insertedRows.push(...rows);
        return {
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'form-3', ...rows[0] }, error: null }),
          }),
        };
      }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    adminClient.from = jest.fn().mockReturnValue(mockChain);

    await service.createPublic('owner-1', {
      event_type: 'birthday_party',
      event_date: '2026-09-01',
      contact_name: 'Frank G',
      contact_email: 'frank@test.com',
      // no event_description
    });

    expect(insertedRows[0]).not.toHaveProperty('event_description');
  });
});
