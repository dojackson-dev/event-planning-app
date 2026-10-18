import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MessageTemplatesService } from './message-templates.service';
import { SupabaseService } from '../supabase/supabase.service';

type Row = Record<string, any>;

function fakeAdmin(rows: Row[]) {
  let seq = rows.length;
  return {
    from: () => {
      const filters: Array<[string, unknown]> = [];
      let op: 'select' | 'insert' | 'update' | 'delete' = 'select';
      let payload: Row = {};
      const match = () =>
        rows.filter((r) => filters.every(([c, v]) => r[c] === v));
      const q: any = {
        select: () => q,
        order: () => q,
        eq: (c: string, v: unknown) => (filters.push([c, v]), q),
        insert: (p: Row) => ((op = 'insert'), (payload = p), q),
        update: (p: Row) => ((op = 'update'), (payload = p), q),
        delete: () => ((op = 'delete'), q),
        maybeSingle: () =>
          Promise.resolve({ data: match()[0] ?? null, error: null }),
        single: () => {
          if (op === 'insert') {
            const row = {
              id: ++seq,
              created_at: 't',
              updated_at: 't',
              is_active: true,
              auto_send: false,
              ...payload,
            };
            rows.push(row);
            return Promise.resolve({ data: row, error: null });
          }
          const row = match()[0];
          if (op === 'update') Object.assign(row, payload);
          return Promise.resolve({ data: row, error: null });
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (op === 'delete')
            match().forEach((r) => rows.splice(rows.indexOf(r), 1));
          return Promise.resolve({ data: match(), error: null }).then(resolve);
        },
      };
      return q;
    },
  };
}

const valid = {
  name: 'Reminder',
  messageType: 'reminder',
  content: 'See you soon',
  recipientType: 'client',
};

function setup(rows: Row[] = []) {
  return new MessageTemplatesService({
    getAdminClient: () => fakeAdmin(rows),
  } as unknown as SupabaseService);
}

describe('MessageTemplatesService', () => {
  it('creates a template for the owner and returns camelCase fields', async () => {
    const rows: Row[] = [];
    const created = await setup(rows).create('owner-1', {
      ...valid,
      sendBeforeDays: 3,
      sendTime: '09:00',
      autoSend: true,
    });
    expect(rows[0].owner_account_id).toBe('owner-1');
    expect(created).toMatchObject({
      name: 'Reminder',
      messageType: 'reminder',
      recipientType: 'client',
      sendBeforeDays: 3,
      sendTime: '09:00',
      autoSend: true,
    });
  });

  it.each([
    [{ ...valid, name: '  ' }],
    [{ ...valid, messageType: 'spam' }],
    [{ ...valid, recipientType: 'everyone' }],
    [{ ...valid, sendTime: '25:99' }],
    [{ ...valid, sendBeforeDays: -2 }],
  ])('rejects invalid input %#', async (input) => {
    await expect(setup().create('owner-1', input)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("never exposes or changes another owner's template", async () => {
    const rows: Row[] = [
      {
        id: '1',
        owner_account_id: 'owner-2',
        name: 'x',
        content: 'y',
        message_type: 'custom',
        recipient_type: 'all',
        is_active: true,
      },
    ];
    const service = setup(rows);
    await expect(service.findAll('owner-1')).resolves.toEqual([]);
    await expect(service.findOne('owner-1', '1')).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      service.update('owner-1', '1', { name: 'hacked' }),
    ).rejects.toThrow(NotFoundException);
    await expect(service.remove('owner-1', '1')).rejects.toThrow(
      NotFoundException,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('x');
  });

  it('toggles active state for the owner', async () => {
    const rows: Row[] = [
      {
        id: '1',
        owner_account_id: 'owner-1',
        name: 'x',
        content: 'y',
        message_type: 'custom',
        recipient_type: 'all',
        is_active: true,
      },
    ];
    const toggled = await setup(rows).toggleActive('owner-1', '1');
    expect(toggled.isActive).toBe(false);
  });
});
