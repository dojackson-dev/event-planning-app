import { ClientPortalService } from './client-portal.service';

type Row = Record<string, any>;

const OWNER = '6e7b0130-9c1d-4a1a-bb02-723a4c67557c';
const OTHER_OWNER = '99999999-9999-4999-8999-999999999999';
const EVENT = '8655eae1-9073-40cc-a5ed-3cec23d828d0';
const FORM = '5353d89d-123c-4bb6-9094-1b6047ffa28d';
const CLIENT_PHONE = '+16012183374';
const TEAM_PHONE = '+16019180418';

/** In-memory stand-in for the Supabase queries the portal messaging makes. */
function fakeDb(tables: Record<string, Row[]>) {
  let seq = 0;
  return {
    from(table: string) {
      tables[table] ??= [];
      const filters: Array<(r: Row) => boolean> = [];
      let op: 'select' | 'insert' = 'select';
      let payload: Row[] = [];
      let sortCol: string | null = null;
      let asc = true;
      let max = Infinity;
      const q: any = {};
      q.select = () => q;
      q.insert = (rows: Row | Row[]) => {
        op = 'insert';
        payload = Array.isArray(rows) ? rows : [rows];
        return q;
      };
      q.eq = (c: string, v: unknown) => {
        filters.push((r) => r[c] === v);
        return q;
      };
      q.in = (c: string, vs: unknown[]) => {
        filters.push((r) => vs.includes(r[c]));
        return q;
      };
      q.order = (c: string, o?: { ascending?: boolean }) => {
        sortCol = c;
        asc = o?.ascending !== false;
        return q;
      };
      q.limit = (n: number) => {
        max = n;
        return q;
      };
      const run = (single: boolean) => {
        const rows = tables[table];
        if (op === 'insert') {
          const added = payload.map((p) => ({
            id: `${table}-${++seq}`,
            created_at: '2026-11-10T00:00:00Z',
            ...p,
          }));
          rows.push(...added);
          return Promise.resolve({
            data: single ? added[0] : added,
            error: null,
          });
        }
        let hit = rows.filter((r) => filters.every((f) => f(r)));
        if (sortCol) {
          const c = sortCol;
          hit = [...hit].sort((a, b) =>
            a[c] === b[c] ? 0 : (a[c] < b[c] ? -1 : 1) * (asc ? 1 : -1),
          );
        }
        hit = hit.slice(0, max);
        return Promise.resolve({
          data: single ? (hit[0] ?? null) : hit,
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

function setup(extra: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {
    event: [
      {
        id: EVENT,
        name: 'POSM Christmas Party',
        date: '2026-12-05',
        owner_id: OWNER,
        intake_form_id: FORM,
      },
    ],
    intake_forms: [
      {
        id: FORM,
        contact_name: 'Shelton Chamber',
        contact_phone: CLIENT_PHONE,
      },
    ],
    event_team_members: [
      { event_id: EVENT, phone: TEAM_PHONE, name: 'Larry Nixon' },
    ],
    owner_accounts: [
      {
        primary_owner_id: OWNER,
        business_name: 'The Rookery MS',
        logo_url: null,
      },
    ],
    client_messages: [],
    ...extra,
  };
  const service = new ClientPortalService(
    { getAdminClient: () => fakeDb(tables) } as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, tables };
}

describe('client portal messages for event team members', () => {
  it('shows the event to a team member, so they can message its owner', async () => {
    const { service } = setup();
    const contacts = await service.getContacts('team-user', TEAM_PHONE);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({
      eventId: EVENT,
      eventName: 'POSM Christmas Party',
      ownerId: OWNER,
      ownerBusinessName: 'The Rookery MS',
    });
  });

  it('still shows the event to the booked client, once', async () => {
    const { service, tables } = setup();
    tables.event_team_members.push({
      event_id: EVENT,
      phone: CLIENT_PHONE,
      name: 'Shelton',
    });
    const contacts = await service.getContacts('client-user', CLIENT_PHONE);
    expect(contacts).toHaveLength(1);
    expect(contacts[0].clientName).toBe('Shelton Chamber');
  });

  it('shows nothing to someone with no booking and no team spot', async () => {
    const { service } = setup();
    expect(await service.getContacts('x', '+16015550199')).toEqual([]);
  });

  it('lets a team member message the owner, and says who it is from', async () => {
    const { service, tables } = setup();
    const saved = await service.sendMessage(
      'team-user',
      TEAM_PHONE,
      OWNER,
      'Can we add 20 chairs?',
      EVENT,
    );
    expect(saved.content).toBe(
      '[Larry Nixon, event team] Can we add 20 chairs?',
    );
    expect(tables.client_messages[0]).toMatchObject({
      event_id: EVENT,
      owner_id: OWNER,
      client_id: 'team-user',
      sender_type: 'client',
    });
  });

  it('keeps the booked client’s messages exactly as written', async () => {
    const { service } = setup();
    const saved = await service.sendMessage(
      'client-user',
      CLIENT_PHONE,
      OWNER,
      'Thanks!',
      EVENT,
    );
    expect(saved.content).toBe('Thanks!');
  });

  it('does not let someone message an event they are not part of', async () => {
    const { service, tables } = setup();
    await expect(
      service.sendMessage('x', '+16015550199', OWNER, 'hi', EVENT),
    ).rejects.toThrow('only message the owner');
    expect(tables.client_messages).toHaveLength(0);
  });

  it('does not let a team member message a different owner', async () => {
    const { service, tables } = setup();
    await expect(
      service.sendMessage('team-user', TEAM_PHONE, OTHER_OWNER, 'hi', EVENT),
    ).rejects.toThrow('only message the owner');
    expect(tables.client_messages).toHaveLength(0);
  });
});
