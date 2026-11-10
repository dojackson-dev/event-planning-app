import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { LeadsService, maskPhone } from './leads.service';
import type { SupabaseService } from '../supabase/supabase.service';

const ID = '11111111-1111-4111-8111-111111111111';
const me = { id: 'agent-me', email: 'agent@x.com' };
const manager = { id: 'agent-mgr', email: 'sales@eventecos.com' };

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: ID,
    name: 'Jane Smith',
    phone: '(404) 555-0123',
    roles: ['venue_owner', 'promoter'],
    description: 'Two venues',
    status: 'new',
    claimed_by_affiliate_id: null,
    claimed_at: null,
    notes: 'call after 5',
    created_at: '2026-10-19T12:00:00Z',
    claimed_by: null,
    ...overrides,
  };
}

function setup(results: Array<{ data?: unknown; error?: unknown }>) {
  const queries: Array<Record<string, jest.Mock>> = [];
  const database = {
    from: jest.fn(() => {
      const result = results.shift() ?? { data: null };
      const query: Record<string, jest.Mock> = {};
      for (const method of [
        'select',
        'eq',
        'is',
        'in',
        'or',
        'neq',
        'order',
        'limit',
        'range',
        'update',
        'insert',
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
  const service = new LeadsService({
    getAdminClient: () => database,
  } as unknown as SupabaseService);
  return { service, queries };
}

describe('maskPhone', () => {
  it('keeps only the last four digits', () => {
    expect(maskPhone('(404) 555-0123')).toBe('***-***-0123');
    expect(maskPhone('12')).toBe('***');
  });
});

describe('LeadsService', () => {
  describe('list', () => {
    const rows = [
      row({ id: 'open' }),
      row({
        id: 'mine',
        status: 'claimed',
        claimed_by_affiliate_id: me.id,
        claimed_by: { first_name: 'Me', last_name: 'Agent' },
      }),
      row({
        id: 'theirs',
        status: 'claimed',
        claimed_by_affiliate_id: 'someone-else',
        claimed_by: { first_name: 'Other', last_name: 'Rep' },
      }),
    ];

    it('shows an agent open leads with the phone hidden and their own with it visible', async () => {
      const { service } = setup([{ data: rows }]);
      const { leads } = await service.list(me);
      expect(leads.map((l) => l.id)).toEqual(['open', 'mine']);
      expect(leads[0]).toMatchObject({
        phone: '***-***-0123',
        notes: null,
        claimed: false,
        roles: ['Venue Owner', 'Promoter'],
      });
      expect(leads[1]).toMatchObject({
        phone: '(404) 555-0123',
        claimed_by_me: true,
        claimed_by_name: 'Me Agent',
        notes: 'call after 5',
      });
    });

    it('shows the manager every lead with full contact details', async () => {
      const { service } = setup([{ data: rows }]);
      const { leads } = await service.list(manager);
      expect(leads).toHaveLength(3);
      expect(leads.every((l) => l.phone === '(404) 555-0123')).toBe(true);
      expect(leads[2].claimed_by_name).toBe('Other Rep');
    });
  });

  describe('claim', () => {
    it('lets an agent claim an unclaimed lead and reveals the phone', async () => {
      const { service, queries } = setup([
        {
          data: row({
            status: 'claimed',
            claimed_by_affiliate_id: me.id,
            claimed_at: '2026-10-19T13:00:00Z',
          }),
        },
      ]);
      const lead = await service.claim(ID, me);
      expect(lead).toMatchObject({
        claimed_by_me: true,
        phone: '(404) 555-0123',
        status: 'claimed',
      });
      expect(queries[0].is).toHaveBeenCalledWith(
        'claimed_by_affiliate_id',
        null,
      );
    });

    it('reports a conflict when another agent claimed it first', async () => {
      const { service } = setup([{ data: null }, { data: { id: ID } }]);
      await expect(service.claim(ID, me)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('reports not found for a lead that does not exist or a bad id', async () => {
      const missing = setup([{ data: null }, { data: null }]);
      await expect(missing.service.claim(ID, me)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      const bad = setup([]);
      await expect(bad.service.claim('nope', me)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update and release', () => {
    const mine = row({
      status: 'claimed',
      claimed_by_affiliate_id: me.id,
    });

    it("rejects changes to another agent's lead", async () => {
      const { service } = setup([
        { data: row({ claimed_by_affiliate_id: 'someone-else' }) },
      ]);
      await expect(
        service.update(ID, me, { status: 'won' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an unknown status', async () => {
      const { service } = setup([{ data: mine }]);
      await expect(
        service.update(ID, me, { status: 'new' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('saves a status and notes for the claiming agent', async () => {
      const { service, queries } = setup([
        { data: mine },
        { data: { ...mine, status: 'contacted', notes: 'left voicemail' } },
      ]);
      const lead = await service.update(ID, me, {
        status: 'contacted',
        notes: ' left voicemail ',
      });
      expect(lead.status).toBe('contacted');
      expect(queries[1].update).toHaveBeenCalledWith({
        updated_at: expect.any(String),
        status: 'contacted',
        notes: 'left voicemail',
      });
    });

    it('releases an open lead back to the pool', async () => {
      const { service, queries } = setup([{ data: mine }, { data: row() }]);
      const lead = await service.release(ID, me);
      expect(lead.claimed).toBe(false);
      expect(queries[1].update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'new',
          claimed_by_affiliate_id: null,
        }),
      );
    });

    it('does not reopen a won lead', async () => {
      const { service } = setup([{ data: { ...mine, status: 'won' } }]);
      await expect(service.release(ID, me)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('lets the manager release a lead claimed by someone else', async () => {
      const { service } = setup([
        { data: row({ status: 'claimed', claimed_by_affiliate_id: me.id }) },
        { data: row() },
      ]);
      await expect(service.release(ID, manager)).resolves.toMatchObject({
        claimed: false,
      });
    });

    it('lets the claiming agent correct contact details and add a business name', async () => {
      const { service, queries } = setup([
        { data: mine },
        { data: [] },
        { data: [] },
        { data: [] },
        {
          data: {
            ...mine,
            phone: '(404) 555-0999',
            business_name: 'Smith Catering',
            email: 'jane@smith.com',
          },
        },
      ]);
      const lead = await service.update(ID, me, {
        phone: '(404) 555-0999',
        business_name: ' Smith Catering ',
        email: 'Jane@Smith.com',
        website: 'smith.com',
      });
      expect(lead).toMatchObject({
        business_name: 'Smith Catering',
        email: 'jane@smith.com',
      });
      expect(queries[4].update).toHaveBeenCalledWith({
        updated_at: expect.any(String),
        phone: '(404) 555-0999',
        business_name: 'Smith Catering',
        email: 'jane@smith.com',
        website: 'https://smith.com',
      });
    });

    it('rejects a phone number that another lead already has unless forced', async () => {
      const { service } = setup([
        { data: mine },
        {
          data: [
            {
              id: 'other',
              name: 'Other Lead',
              business_name: null,
              status: 'new',
              claimed_by_affiliate_id: null,
              phone_digits: '4045550999',
              email_key: null,
              business_key: null,
            },
          ],
        },
      ]);
      await expect(
        service.update(ID, me, { phone: '(404) 555-0999' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('does not recheck duplicates for fields that did not change', async () => {
      const { service, queries } = setup([
        { data: mine },
        { data: { ...mine, city: 'Atlanta' } },
      ]);
      await service.update(ID, me, { city: 'Atlanta', phone: mine.phone });
      expect(queries).toHaveLength(2);
      expect(queries[1].update).toHaveBeenCalled();
    });

    it('lets the manager edit contact details on a lead nobody has claimed', async () => {
      const { service } = setup([
        { data: row() },
        { data: row({ city: 'Macon' }) },
      ]);
      await expect(
        service.update(ID, manager, { city: 'Macon' }),
      ).resolves.toMatchObject({ city: 'Macon' });
    });

    it('still requires a claim before changing the status of an unclaimed lead', async () => {
      const { service } = setup([{ data: row() }]);
      await expect(
        service.update(ID, manager, { status: 'contacted' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid website or email', async () => {
      const { service } = setup([{ data: mine }, { data: mine }]);
      await expect(
        service.update(ID, me, { website: 'javascript:alert(1)' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.update(ID, me, { email: 'not-an-email' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('visibility of new fields', () => {
    const rich = row({
      business_name: 'Smith Catering',
      email: 'jane@smith.com',
      city: 'Atlanta',
      lead_type: 'caterer',
      source: 'manual',
      custom_fields: { guest_count: 200 },
      next_follow_up_at: '2026-11-12T12:00:00Z',
    });

    it('hides email, notes, follow-up and custom fields until the lead is claimed', async () => {
      const { service } = setup([{ data: [rich] }]);
      const { leads } = await service.list(me);
      expect(leads[0]).toMatchObject({
        business_name: 'Smith Catering',
        city: 'Atlanta',
        lead_type_label: 'Caterer',
        email: null,
        notes: null,
        custom_fields: {},
        next_follow_up_at: null,
        contact_visible: false,
      });
    });

    it('shows them to the agent who claimed the lead', async () => {
      const { service } = setup([
        {
          data: [
            { ...rich, status: 'claimed', claimed_by_affiliate_id: me.id },
          ],
        },
      ]);
      const { leads } = await service.list(me);
      expect(leads[0]).toMatchObject({
        email: 'jane@smith.com',
        custom_fields: { guest_count: 200 },
        contact_visible: true,
      });
    });

    it('only asks the database for open leads and the agent’s own', async () => {
      const { service, queries } = setup([{ data: [] }]);
      await service.list(me);
      expect(queries[0].or).toHaveBeenCalledWith(
        `claimed_by_affiliate_id.is.null,claimed_by_affiliate_id.eq.${me.id}`,
      );
      const managerRun = setup([{ data: [] }]);
      await managerRun.service.list(manager);
      expect(managerRun.queries[0].or).not.toHaveBeenCalled();
    });

    it('falls back to the original columns until the CRM migration is run', async () => {
      const { service, queries } = setup([
        {
          data: null,
          error: { code: '42703', message: 'column does not exist' },
        },
        { data: [row()] },
      ]);
      const { leads } = await service.list(manager);
      expect(leads).toHaveLength(1);
      expect(leads[0]).toMatchObject({
        business_name: null,
        source: 'demo_request',
      });
      expect(queries[0].select).toHaveBeenCalledWith(
        expect.stringContaining('business_name'),
      );
      expect(queries[1].select).toHaveBeenCalledWith(
        expect.not.stringContaining('business_name'),
      );
    });
  });

  describe('create', () => {
    const body = {
      name: 'Jane Smith',
      phone: '(404) 555-0123',
      business_name: 'Smith Catering',
      lead_type: 'caterer',
    };
    const saved = row({
      business_name: 'Smith Catering',
      lead_type: 'caterer',
      source: 'manual',
      status: 'claimed',
      claimed_by_affiliate_id: me.id,
    });

    it('creates the lead for the agent and claims it for them', async () => {
      const { service, queries } = setup([
        { data: [] },
        { data: [] },
        { data: saved },
        { data: null },
      ]);
      const lead = await service.create(me, body);
      expect(lead).toMatchObject({ claimed_by_me: true, status: 'claimed' });
      expect(queries[2].insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Jane Smith',
          business_name: 'Smith Catering',
          lead_type: 'caterer',
          source: 'manual',
          status: 'claimed',
          claimed_by_affiliate_id: me.id,
          created_by_affiliate_id: me.id,
        }),
      );
    });

    it('leaves a manager-created lead in the pool', async () => {
      const { service, queries } = setup([
        { data: [] },
        { data: [] },
        { data: row() },
        { data: null },
      ]);
      await service.create(manager, body);
      expect(queries[2].insert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'new',
          claimed_by_affiliate_id: null,
        }),
      );
    });

    it('does not let an agent assign a new lead to someone else', async () => {
      const { service, queries } = setup([
        { data: [] },
        { data: [] },
        { data: saved },
        { data: null },
      ]);
      await service.create(me, { ...body, assign_to: 'someone-else' });
      expect(queries[2].insert).toHaveBeenCalledWith(
        expect.objectContaining({ claimed_by_affiliate_id: me.id }),
      );
    });

    it('warns about a duplicate and returns who has it, without contact details', async () => {
      const { service } = setup([
        {
          data: [
            {
              id: 'dup',
              name: 'Jane S.',
              business_name: 'Smith Catering',
              status: 'claimed',
              claimed_by_affiliate_id: 'someone-else',
              phone_digits: '4045550123',
              email_key: null,
              business_key: 'smith catering',
              claimed_by: { first_name: 'Other', last_name: 'Rep' },
            },
          ],
        },
        { data: [] },
      ]);
      const error = await service.create(me, body).catch((e) => e);
      expect(error).toBeInstanceOf(ConflictException);
      const response = error.getResponse();
      expect(response.code).toBe('duplicate_lead');
      expect(response.duplicates).toEqual([
        {
          id: 'dup',
          name: 'Jane S.',
          business_name: 'Smith Catering',
          status: 'claimed',
          claimed_by_me: false,
          claimed_by_name: 'Other Rep',
          reasons: ['phone', 'business'],
        },
      ]);
      expect(JSON.stringify(response)).not.toContain('555');
    });

    it('saves anyway when the agent confirms', async () => {
      const { service, queries } = setup([{ data: saved }, { data: null }]);
      await service.create(me, { ...body, force: true });
      expect(queries[0].insert).toHaveBeenCalled();
    });

    it('requires a name and a valid phone number', async () => {
      const { service } = setup([]);
      await expect(
        service.create(me, { phone: '(404) 555-0123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create(me, { name: 'Jane', phone: 'call me' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects custom fields that were never defined', async () => {
      const { service } = setup([{ data: [] }]);
      await expect(
        service.create(me, { ...body, custom_fields: { nope: 'x' } }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('assign', () => {
    const AGENT_ID = '22222222-2222-4222-8222-222222222222';

    it('is manager only', async () => {
      const { service } = setup([]);
      await expect(
        service.assign(ID, me, { affiliate_id: AGENT_ID }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.assignBulk(me, { ids: [ID], affiliate_id: AGENT_ID }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(service.remove(ID, me)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('hands a new lead to an active agent and marks it claimed', async () => {
      const { service, queries } = setup([
        { data: row() },
        {
          data: {
            id: AGENT_ID,
            first_name: 'Sam',
            last_name: 'Rep',
            email: 'sam@x.com',
            status: 'active',
          },
        },
        {
          data: row({ status: 'claimed', claimed_by_affiliate_id: AGENT_ID }),
        },
        { data: null },
      ]);
      const lead = await service.assign(ID, manager, {
        affiliate_id: AGENT_ID,
      });
      expect(lead.claimed).toBe(true);
      expect(queries[2].update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'claimed',
          claimed_by_affiliate_id: AGENT_ID,
        }),
      );
    });

    it('refuses an inactive agent and closed leads', async () => {
      const inactive = setup([
        { data: row() },
        {
          data: {
            id: AGENT_ID,
            first_name: 'A',
            last_name: 'B',
            email: 'a@x.com',
            status: 'inactive',
          },
        },
      ]);
      await expect(
        inactive.service.assign(ID, manager, { affiliate_id: AGENT_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);
      const closed = setup([{ data: row({ status: 'won' }) }]);
      await expect(
        closed.service.assign(ID, manager, { affiliate_id: AGENT_ID }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('returns a lead to the pool when no agent is given', async () => {
      const { service, queries } = setup([
        { data: row({ status: 'claimed', claimed_by_affiliate_id: me.id }) },
        { data: row() },
        { data: null },
      ]);
      await service.assign(ID, manager, {});
      expect(queries[1].update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'new',
          claimed_by_affiliate_id: null,
        }),
      );
    });
  });

  describe('resolveOwner', () => {
    it('always makes an agent the owner of what they add', async () => {
      const { service } = setup([]);
      await expect(service.resolveOwner(me, 'pool')).resolves.toBe(me.id);
      await expect(service.resolveOwner(me, undefined)).resolves.toBe(me.id);
    });

    it('lets the manager choose the pool, themselves or an agent id', async () => {
      const { service } = setup([]);
      await expect(
        service.resolveOwner(manager, undefined),
      ).resolves.toBeNull();
      await expect(service.resolveOwner(manager, 'pool')).resolves.toBeNull();
      await expect(service.resolveOwner(manager, 'me')).resolves.toBe(
        manager.id,
      );
      await expect(
        service.resolveOwner(manager, 'nope'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
