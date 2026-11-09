import { PromoterService } from './promoter.service';

type Row = Record<string, any>;

const USER_ID = '6e7b0130-9c1d-4a1a-bb02-723a4c67557c';
const OWNER_ACCOUNT = '99394c1a-5714-44ac-bd5f-97c3f2a478d5';

/** Just enough of the Supabase query builder for the tables the promoter service touches. */
function fakeDb(tables: Record<string, Row[]>) {
  return {
    from(table: string) {
      const filters: Array<(r: Row) => boolean> = [];
      let op: 'select' | 'insert' | 'update' = 'select';
      let payload: Row = {};
      const q: any = {};
      q.select = () => q;
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
      q.eq = (col: string, val: unknown) => {
        filters.push((r) => r[col] === val);
        return q;
      };
      const run = (single: boolean) => {
        const rows = tables[table];
        if (op === 'insert') {
          const row = { id: `new-${rows.length + 1}`, ...payload };
          rows.push(row);
          return Promise.resolve({ data: row, error: null });
        }
        const hit = rows.filter((r) => filters.every((f) => f(r)));
        if (op === 'update') {
          hit.forEach((r) => Object.assign(r, payload));
          return Promise.resolve({ data: null, error: null });
        }
        return Promise.resolve({
          data: single ? (hit[0] ?? null) : hit,
          error: null,
        });
      };
      q.then = (resolve: (v: unknown) => unknown) => run(false).then(resolve);
      q.single = () => run(true);
      q.maybeSingle = () => run(true);
      return q;
    },
  };
}

function setup(user: Row) {
  const tables: Record<string, Row[]> = {
    users: [
      {
        id: USER_ID,
        email: 'events@therookeryms.com',
        first_name: 'Dee',
        last_name: 'Nixon',
        ...user,
      },
    ],
    memberships: [
      { user_id: USER_ID, owner_account_id: OWNER_ACCOUNT, role: 'owner' },
    ],
    promoter_accounts: [],
  };
  const service = new PromoterService({
    getAdminClient: () => fakeDb(tables),
  } as any);
  return { service, tables };
}

describe('PromoterService owner enabling promoter mode', () => {
  it('keeps the owner role (subscription checks read it) and adds promoter to roles', async () => {
    const { service, tables } = setup({
      role: 'owner',
      roles: ['owner', 'vendor'],
    });
    const result = await service.enablePromoterMode(USER_ID);
    expect(result.alreadyExisted).toBe(false);
    expect(tables.users[0].role).toBe('owner');
    expect(tables.users[0].roles).toEqual(['owner', 'vendor', 'promoter']);
    expect(tables.promoter_accounts[0]).toMatchObject({
      user_id: USER_ID,
      owner_account_id: OWNER_ACCOUNT,
    });
  });

  it('starts a roles list for an owner who only has the single role column', async () => {
    const { service, tables } = setup({ role: 'owner', roles: null });
    await service.enablePromoterMode(USER_ID);
    expect(tables.users[0].role).toBe('owner');
    expect(tables.users[0].roles).toEqual(['owner', 'promoter']);
  });

  it('is a no-op the second time', async () => {
    const { service, tables } = setup({ role: 'owner', roles: ['owner'] });
    await service.enablePromoterMode(USER_ID);
    const again = await service.enablePromoterMode(USER_ID);
    expect(again.alreadyExisted).toBe(true);
    expect(tables.promoter_accounts).toHaveLength(1);
    expect(tables.users[0].roles).toEqual(['owner', 'promoter']);
  });
});

describe('PromoterService standalone registration', () => {
  it('still makes a standalone promoter a promoter', async () => {
    const { service, tables } = setup({ role: 'client', roles: null });
    await service.createPromoterAccount(USER_ID, {
      contactName: 'Pat',
      email: 'pat@example.com',
    } as any);
    expect(tables.users[0].role).toBe('promoter');
  });
});
