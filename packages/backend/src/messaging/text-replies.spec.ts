import { MessagingService } from './messaging.service';
import {
  buildConversations,
  phoneKey,
  phoneVariants,
} from './text-conversations';

type Row = Record<string, any>;

const OWNER = '6e7b0130-9c1d-4a1a-bb02-723a4c67557c';
const OTHER_OWNER = '99999999-9999-4999-8999-999999999999';

/** In-memory stand-in for the Supabase calls the messaging service makes. */
function fakeDb(tables: Record<string, Row[]>) {
  let seq = 0;
  return {
    from(table: string) {
      tables[table] ??= [];
      const filters: Array<(r: Row) => boolean> = [];
      let op: 'select' | 'insert' | 'update' = 'select';
      let payload: Row = {};
      let countOnly = false;
      let sort: { col: string; asc: boolean } | null = null;
      let max = Infinity;
      const q: any = {};
      q.select = (_c?: string, opts?: { head?: boolean }) => {
        if (op === 'select') countOnly = !!opts?.head;
        return q;
      };
      q.insert = (row: Row) => {
        op = 'insert';
        payload = row;
        return q;
      };
      q.update = (patch: Row) => {
        op = 'update';
        payload = patch;
        return q;
      };
      q.eq = (c: string, v: unknown) => {
        filters.push((r) => r[c] === v);
        return q;
      };
      q.neq = (c: string, v: unknown) => {
        filters.push((r) => r[c] !== v);
        return q;
      };
      q.in = (c: string, vs: unknown[]) => {
        filters.push((r) => vs.includes(r[c]));
        return q;
      };
      q.not = (c: string, _o: string, v: unknown) => {
        filters.push((r) => (r[c] ?? null) !== v);
        return q;
      };
      q.order = (c: string, o?: { ascending?: boolean }) => {
        sort = { col: c, asc: o?.ascending !== false };
        return q;
      };
      q.limit = (n: number) => {
        max = n;
        return q;
      };
      const run = (single: boolean) => {
        const rows = tables[table];
        if (op === 'insert') {
          rows.push({
            id: `${table}-${++seq}`,
            created_at: new Date().toISOString(),
            ...payload,
          });
          return Promise.resolve({ data: null, error: null });
        }
        const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'update') {
          hit.forEach((r) => Object.assign(r, payload));
          return Promise.resolve({ data: null, error: null });
        }
        if (countOnly) {
          return Promise.resolve({ count: hit.length, error: null });
        }
        if (sort) {
          const { col, asc } = sort;
          hit.sort((a, b) =>
            a[col] === b[col] ? 0 : (a[col] < b[col] ? -1 : 1) * (asc ? 1 : -1),
          );
        }
        const out = hit.slice(0, max);
        return Promise.resolve({
          data: single ? (out[0] ?? null) : out,
          error: null,
        });
      };
      q.single = () => run(true);
      q.maybeSingle = () => run(true);
      q.then = (resolve: (v: unknown) => unknown) => run(false).then(resolve);
      return q;
    },
  };
}

function setup(tables: Record<string, Row[]>) {
  const db = fakeDb(tables);
  const twilio = {
    parseInboundMessage: (body: string, from: string) => {
      const k = body.trim().toUpperCase();
      return {
        action: k === 'STOP' ? 'stop' : k === 'START' ? 'start' : null,
        from,
      };
    },
  };
  const service = new MessagingService(
    { getAdminClient: () => db } as any,
    twilio as any,
  );
  return { service, db, tables };
}

const sent = (over: Row = {}): Row => ({
  id: `m-${Math.random()}`,
  owner_id: OWNER,
  recipient_phone: '+16012183374',
  recipient_name: 'Shelton Chamber',
  content: 'Hi Shelton',
  message: 'Hi Shelton',
  status: 'sent',
  created_at: '2026-11-04T15:00:00Z',
  ...over,
});

describe('phone helpers', () => {
  it('treats every format of a US number as the same person', () => {
    expect(phoneKey('+16012183374')).toBe('6012183374');
    expect(phoneKey('(601) 218-3374')).toBe('6012183374');
    expect(phoneVariants('+16012183374')).toEqual(
      expect.arrayContaining(['+16012183374', '6012183374', '16012183374']),
    );
  });
});

describe('buildConversations', () => {
  it('groups by person, shows the newest text and counts unread replies', () => {
    const rows = [
      {
        ...sent(),
        status: 'received',
        read: false,
        content: 'Yes! See you then',
        created_at: '2026-11-04T16:00:00Z',
      },
      {
        ...sent(),
        status: 'received',
        read: false,
        content: 'Thanks',
        created_at: '2026-11-04T15:30:00Z',
        recipient_phone: '6012183374',
      },
      {
        ...sent(),
        status: 'received',
        read: true,
        content: 'old',
        created_at: '2026-11-03T10:00:00Z',
      },
      sent(),
      sent({
        recipient_phone: '+16015550100',
        recipient_name: 'Pat',
        created_at: '2026-11-02T09:00:00Z',
      }),
    ] as any[];
    const threads = buildConversations(rows);
    expect(threads).toHaveLength(2);
    expect(threads[0]).toMatchObject({
      name: 'Shelton Chamber',
      lastMessage: 'Yes! See you then',
      lastDirection: 'inbound',
      unreadCount: 2,
    });
    expect(threads[1]).toMatchObject({
      name: 'Pat',
      unreadCount: 0,
      lastDirection: 'outbound',
    });
  });
});

describe('MessagingService text replies', () => {
  it('saves a reply into the conversation of the owner who texted that person', async () => {
    const { service, tables } = setup({ messages: [sent()], rsvp_guests: [] });
    const saved = await service.storeInboundReply(
      fakeDb(tables),
      'Yes! See you then',
      '+16012183374',
      'SM111',
    );
    expect(saved).toBe(true);
    const reply = tables.messages[1];
    expect(reply).toMatchObject({
      owner_id: OWNER,
      recipient_phone: '+16012183374',
      recipient_name: 'Shelton Chamber',
      status: 'received',
      read: false,
      message: 'Yes! See you then',
      content: 'Yes! See you then',
      twilio_sid: 'SM111',
    });
  });

  it('matches the number however it was stored when the owner texted it', async () => {
    const { service, tables } = setup({
      messages: [sent({ recipient_phone: '6012183374' })],
      rsvp_guests: [],
    });
    expect(
      await service.storeInboundReply(
        fakeDb(tables),
        'hi',
        '+16012183374',
        'SM1',
      ),
    ).toBe(true);
    expect(tables.messages[1].owner_id).toBe(OWNER);
  });

  it('finds the owner through an RSVP invitation when no text was logged', async () => {
    const { service, tables } = setup({
      messages: [],
      rsvp_guests: [
        {
          owner_id: OWNER,
          guest_name: 'Dustin Benge',
          guest_phone: '6018964885',
          created_at: '2026-10-18T00:00:00Z',
        },
      ],
    });
    await service.storeInboundReply(
      fakeDb(tables),
      'Count me in',
      '+16018964885',
      'SM2',
    );
    expect(tables.messages[0]).toMatchObject({
      owner_id: OWNER,
      recipient_name: 'Dustin Benge',
      status: 'received',
    });
  });

  it('gives the reply to the owner who was in touch most recently', async () => {
    const { service, tables } = setup({
      messages: [
        sent({ created_at: '2026-10-01T00:00:00Z' }),
        sent({ owner_id: OTHER_OWNER, created_at: '2026-11-01T00:00:00Z' }),
      ],
      rsvp_guests: [],
    });
    await service.storeInboundReply(
      fakeDb(tables),
      'hello',
      '+16012183374',
      'SM3',
    );
    expect(tables.messages[2].owner_id).toBe(OTHER_OWNER);
  });

  it('keeps one copy when Twilio delivers the same text twice', async () => {
    const { service, tables } = setup({ messages: [sent()], rsvp_guests: [] });
    const db = fakeDb(tables);
    await service.storeInboundReply(db, 'hi', '+16012183374', 'SMdup');
    expect(
      await service.storeInboundReply(db, 'hi', '+16012183374', 'SMdup'),
    ).toBe(false);
    expect(
      tables.messages.filter((m) => m.twilio_sid === 'SMdup'),
    ).toHaveLength(1);
  });

  it('drops a reply from a number nobody on EventEcos has been in touch with', async () => {
    const { service, tables } = setup({ messages: [], rsvp_guests: [] });
    expect(
      await service.storeInboundReply(
        fakeDb(tables),
        'who is this',
        '+15005550006',
        'SM4',
      ),
    ).toBe(false);
    expect(tables.messages).toHaveLength(0);
  });

  it('still treats STOP as an opt-out, and the owner also sees that they replied', async () => {
    const { service, tables } = setup({
      messages: [sent()],
      rsvp_guests: [],
      users: [{ id: 'u1', phone: '+16012183374', sms_opt_in: true }],
    });
    await service.handleInboundMessage(
      fakeDb(tables),
      'STOP',
      '+16012183374',
      'SM5',
    );
    expect(tables.users[0].sms_opt_in).toBe(false);
    expect(tables.messages).toHaveLength(2);
    expect(tables.messages[1]).toMatchObject({
      content: 'STOP',
      status: 'received',
    });
  });

  it('keeps a plain "Yes" reply as a conversation text', async () => {
    const { service, tables } = setup({
      messages: [sent()],
      rsvp_guests: [],
      users: [],
    });
    await service.handleInboundMessage(
      fakeDb(tables),
      'Yes',
      '+16012183374',
      'SM6',
    );
    expect(tables.messages[1]).toMatchObject({
      content: 'Yes',
      status: 'received',
    });
  });

  it('shows a conversation oldest-first with the direction of each text', async () => {
    const { service } = setup({
      messages: [
        sent({ id: 'a', created_at: '2026-11-04T15:00:00Z' }),
        sent({
          id: 'b',
          status: 'received',
          read: false,
          content: 'Yes',
          message: 'Yes',
          created_at: '2026-11-04T16:00:00Z',
          recipient_phone: '6012183374',
        }),
        sent({ id: 'c', recipient_phone: '+16015550100' }),
        sent({ id: 'd', owner_id: OTHER_OWNER }),
      ],
    });
    const thread = await service.getConversation(OWNER, '+16012183374');
    expect(thread.map((m) => [m.id, m.direction])).toEqual([
      ['a', 'outbound'],
      ['b', 'inbound'],
    ]);
  });

  it('marks only that person’s replies as read, and the unread count includes replies', async () => {
    const { service, tables } = setup({
      messages: [
        sent({ id: 'a', status: 'received', read: false }),
        sent({
          id: 'b',
          status: 'received',
          read: false,
          recipient_phone: '+16015550100',
        }),
      ],
      client_messages: [],
    });
    expect(await service.getClientInboxUnreadCount(OWNER)).toBe(2);
    await service.markConversationRead(OWNER, '+16012183374');
    expect(tables.messages[0].read).toBe(true);
    expect(tables.messages[1].read).toBe(false);
    expect(await service.getClientInboxUnreadCount(OWNER)).toBe(1);
  });
});
