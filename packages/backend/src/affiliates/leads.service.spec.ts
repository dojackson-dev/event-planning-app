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
        'order',
        'limit',
        'update',
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
  });
});
