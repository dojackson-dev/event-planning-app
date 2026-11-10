import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LeadActivitiesService } from './lead-activities.service';
import { SalesSettingsService } from './sales-settings.service';
import type { LeadsService } from './leads.service';
import type { SupabaseService } from '../supabase/supabase.service';

const ID = '11111111-1111-4111-8111-111111111111';
const ATT = '33333333-3333-4333-8333-333333333333';
const me = { id: 'agent-me', email: 'agent@x.com' };
const manager = { id: 'agent-mgr', email: 'sales@eventecos.com' };

function fakeDb(
  results: Array<{ data?: unknown; error?: unknown; count?: number }>,
) {
  const queries: Array<Record<string, jest.Mock>> = [];
  const storage = {
    getBucket: jest.fn(() => Promise.resolve({ error: null })),
    createBucket: jest.fn(() => Promise.resolve({ error: null })),
    from: jest.fn(() => ({
      upload: jest.fn(() => Promise.resolve({ error: null })),
      remove: jest.fn(() => Promise.resolve({ error: null })),
      createSignedUrl: jest.fn(() =>
        Promise.resolve({
          data: { signedUrl: 'https://signed.example/file' },
          error: null,
        }),
      ),
    })),
  };
  const db = {
    storage,
    from: jest.fn(() => {
      const result = results.shift() ?? { data: null };
      const query: Record<string, jest.Mock> = {};
      for (const method of [
        'select',
        'eq',
        'order',
        'limit',
        'insert',
        'update',
        'delete',
        'single',
        'maybeSingle',
      ]) {
        query[method] = jest.fn(() => query);
      }
      query.then = jest.fn((resolve: (value: unknown) => unknown) =>
        Promise.resolve(result).then(resolve),
      );
      queries.push(query);
      return query;
    }),
  };
  return { db, queries, storage };
}

function activities(
  results: Array<{ data?: unknown; error?: unknown; count?: number }>,
) {
  const { db, queries, storage } = fakeDb(results);
  const leads = { assertAccess: jest.fn(() => Promise.resolve({ id: ID })) };
  const service = new LeadActivitiesService(
    { getAdminClient: () => db } as unknown as SupabaseService,
    leads as unknown as LeadsService,
  );
  return { service, queries, storage, leads };
}

describe('LeadActivitiesService', () => {
  const saved = {
    id: 'a1',
    type: 'call',
    direction: 'outbound',
    subject: null,
    body: 'Left voicemail',
    outcome: 'Left voicemail',
    created_at: '2026-11-10T12:00:00Z',
    by: { first_name: 'Me', last_name: 'Agent' },
  };

  it('checks lead access before anything else', async () => {
    const { service, leads } = activities([]);
    leads.assertAccess.mockRejectedValueOnce(new ForbiddenException());
    await expect(service.list(ID, me)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('logs a call, stamps the last contact and sets the next follow-up', async () => {
    const { service, queries } = activities([{ data: saved }, { data: null }]);
    const activity = await service.add(ID, me, {
      type: 'call',
      outcome: 'Left voicemail',
      body: 'Left voicemail',
      follow_up_at: '2026-11-15',
    });
    expect(activity).toMatchObject({ type: 'call', by_name: 'Me Agent' });
    expect(queries[0].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        lead_id: ID,
        affiliate_id: me.id,
        type: 'call',
      }),
    );
    expect(queries[1].update).toHaveBeenCalledWith({
      last_contacted_at: expect.any(String),
      next_follow_up_at: '2026-11-15T12:00:00.000Z',
      updated_at: expect.any(String),
    });
  });

  it('does not count a note as contact', async () => {
    const { service, queries } = activities([
      { data: { ...saved, type: 'note' } },
    ]);
    await service.add(ID, me, { type: 'note', body: 'Prefers email' });
    expect(queries).toHaveLength(1);
  });

  it.each([
    [{ type: 'carrier pigeon', body: 'x' }],
    [{ type: 'call' }],
    [{ type: 'call', body: 'x', direction: 'sideways' }],
    [{ type: 'call', body: 'x'.repeat(4001) }],
    [{ type: 'call', body: 'x', follow_up_at: 'whenever' }],
  ])('rejects %j', async (body) => {
    const { service } = activities([]);
    await expect(service.add(ID, me, body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  describe('attachments', () => {
    const pdf = {
      originalname: 'menu sample.pdf',
      mimetype: 'application/pdf',
      size: 1000,
      buffer: Buffer.from('x'),
    };

    it('rejects missing, mismatched, oversized and excess files', async () => {
      const none = activities([]);
      await expect(
        none.service.addAttachment(ID, me, undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
      const exe = activities([]);
      await expect(
        exe.service.addAttachment(ID, me, { ...pdf, originalname: 'run.exe' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      const disguised = activities([]);
      await expect(
        disguised.service.addAttachment(ID, me, {
          ...pdf,
          mimetype: 'application/x-msdownload',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      const big = activities([]);
      await expect(
        big.service.addAttachment(ID, me, { ...pdf, size: 11 * 1024 * 1024 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      const full = activities([{ count: 20 }]);
      await expect(
        full.service.addAttachment(ID, me, pdf),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores a clean file name under the lead folder', async () => {
      const { service, queries } = activities([
        { count: 0 },
        {
          data: {
            id: ATT,
            file_name: 'menu_sample.pdf',
            mime_type: 'application/pdf',
            size_bytes: 1000,
            created_at: '2026-11-10T12:00:00Z',
            by: null,
          },
        },
      ]);
      const attachment = await service.addAttachment(ID, me, pdf);
      expect(attachment.file_name).toBe('menu_sample.pdf');
      expect(queries[1].insert).toHaveBeenCalledWith(
        expect.objectContaining({
          lead_id: ID,
          storage_path: expect.stringMatching(
            new RegExp(`^${ID}/\\d+-menu_sample\\.pdf$`),
          ),
        }),
      );
    });

    it('hands out a short-lived signed link', async () => {
      const { service } = activities([
        {
          data: { id: ATT, file_name: 'a.pdf', storage_path: `${ID}/1-a.pdf` },
        },
      ]);
      await expect(service.attachmentUrl(ID, ATT, me)).resolves.toEqual({
        url: 'https://signed.example/file',
      });
    });

    it('treats a malformed attachment id as not found', async () => {
      const { service } = activities([]);
      await expect(service.attachmentUrl(ID, 'nope', me)).rejects.toThrow(
        'Attachment not found.',
      );
    });
  });
});

describe('SalesSettingsService', () => {
  function settings(results: Array<{ data?: unknown; error?: unknown }>) {
    const { db, queries } = fakeDb(results);
    const service = new SalesSettingsService({
      getAdminClient: () => db,
    } as unknown as SupabaseService);
    return { service, queries };
  }

  it('lets only the manager change fields and scripts', async () => {
    const { service } = settings([]);
    await expect(
      service.createCustomField(me, { label: 'Guests' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteCustomField(me, ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(
      service.createScript(me, { title: 'T', body: 'B' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.updateScript(me, ID, { title: 'T' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.deleteScript(me, ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('creates a field keyed by a slug of its name', async () => {
    const { service, queries } = settings([
      { data: [] },
      {
        data: {
          id: '1',
          field_key: 'guest_count',
          label: 'Guest Count',
          field_type: 'number',
          options: [],
          sort_order: 0,
        },
      },
    ]);
    await service.createCustomField(manager, {
      label: 'Guest Count',
      field_type: 'number',
    });
    expect(queries[1].insert).toHaveBeenCalledWith(
      expect.objectContaining({
        field_key: 'guest_count',
        field_type: 'number',
      }),
    );
  });

  it('rejects a duplicate field name, a bad type and a choice list with too few options', async () => {
    const existing = {
      id: '1',
      field_key: 'guest_count',
      label: 'Guest Count',
      field_type: 'number',
      options: [],
      sort_order: 0,
    };
    const dup = settings([{ data: [existing] }]);
    await expect(
      dup.service.createCustomField(manager, { label: 'guest count' }),
    ).rejects.toThrow('already exists');
    const type = settings([]);
    await expect(
      type.service.createCustomField(manager, {
        label: 'X',
        field_type: 'file',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    const few = settings([]);
    await expect(
      few.service.createCustomField(manager, {
        label: 'Stage',
        field_type: 'select',
        options: ['Only'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('shows agents only active scripts and the manager all of them', async () => {
    const agent = settings([{ data: [] }]);
    await agent.service.listScripts(me);
    expect(agent.queries[0].eq).toHaveBeenCalledWith('is_active', true);
    const mgr = settings([{ data: [] }]);
    await mgr.service.listScripts(manager);
    expect(mgr.queries[0].eq).not.toHaveBeenCalled();
  });

  it('returns no scripts instead of failing before the migration is run', async () => {
    const { service } = settings([
      {
        data: null,
        error: { code: '42P01', message: 'relation does not exist' },
      },
    ]);
    await expect(service.listScripts(me)).resolves.toEqual({ scripts: [] });
  });

  it('validates scripts', async () => {
    const { service } = settings([]);
    await expect(
      service.createScript(manager, { title: '', body: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createScript(manager, {
        title: 'T',
        body: 'x',
        audience: 'aliens',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
