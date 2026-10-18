/* In-memory stand-in for the slice of the Supabase query builder the bidding services use. Test-only. */
import { randomUUID } from 'crypto';
import type { SupabaseService } from '../../supabase/supabase.service';

export type Row = Record<string, any>;

type Filter = (row: Row) => boolean;

function get(row: Row, path: string): any {
  return path
    .split('.')
    .reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), row);
}

export interface FakeDbOptions {
  /** table -> list of unique column sets (null values never collide). */
  uniques?: Record<string, string[][]>;
  /** table -> defaults applied on insert. */
  defaults?: Record<string, () => Row>;
  rpc?: Record<string, (args: Row) => any>;
}

export class FakeDb {
  tables: Record<string, Row[]>;
  rpcCalls: Array<{ name: string; args: Row }> = [];
  queries: Array<{ table: string; op: string }> = [];
  /** Run once before the next insert into a table (simulates a concurrent writer). */
  beforeInsert: Record<string, Array<() => void>> = {};

  constructor(
    tables: Record<string, Row[]> = {},
    private readonly options: FakeDbOptions = {},
  ) {
    this.tables = tables;
  }

  table(name: string): Row[] {
    return (this.tables[name] ??= []);
  }

  from = (name: string) => new FakeQuery(this, name, this.options);

  rpc = (name: string, args: Row) => {
    this.rpcCalls.push({ name, args });
    const handler = this.options.rpc?.[name];
    if (!handler) {
      return Promise.resolve({
        data: null,
        error: { message: `no rpc ${name}` },
      });
    }
    return Promise.resolve(handler(args)).then((out) =>
      out && typeof out === 'object' && 'error' in out && out.error
        ? { data: null, error: out.error }
        : { data: out, error: null },
    );
  };

  asService(): SupabaseService {
    return {
      getAdminClient: () => ({ from: this.from, rpc: this.rpc }),
      getClient: () => ({}),
    } as unknown as SupabaseService;
  }
}

class FakeQuery implements PromiseLike<any> {
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private filters: Filter[] = [];
  private orders: Array<{ col: string; asc: boolean }> = [];
  private limitN?: number;
  private payload: Row | Row[] = {};
  private returning = false;
  private head = false;
  private wantCount = false;

  constructor(
    private readonly db: FakeDb,
    private readonly name: string,
    private readonly options: FakeDbOptions,
  ) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op !== 'select') this.returning = true;
    if (opts?.head) this.head = true;
    if (opts?.count) this.wantCount = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = 'update';
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  private add(filter: Filter) {
    this.filters.push(filter);
    return this;
  }
  eq(col: string, value: any) {
    return this.add((r) => get(r, col) === value);
  }
  neq(col: string, value: any) {
    return this.add((r) => get(r, col) !== value);
  }
  gt(col: string, value: any) {
    return this.add((r) => get(r, col) > value);
  }
  gte(col: string, value: any) {
    return this.add((r) => get(r, col) >= value);
  }
  lt(col: string, value: any) {
    return this.add((r) => get(r, col) < value);
  }
  in(col: string, values: any[]) {
    return this.add((r) => values.includes(get(r, col)));
  }
  is(col: string, value: null) {
    return this.add((r) => (get(r, col) ?? null) === value);
  }
  not(col: string, _op: string, value: null) {
    return this.add((r) => (get(r, col) ?? null) !== value);
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private run(): { data: any; error: any; count?: number } {
    this.db.queries.push({ table: this.name, op: this.op });
    const rows = this.db.table(this.name);
    if (this.op === 'insert') return this.runInsert(rows);

    const matched = rows.filter((r) => this.filters.every((f) => f(r)));
    if (this.op === 'update') {
      for (const row of matched) Object.assign(row, this.payload);
      return {
        data: this.returning ? matched.map((r) => ({ ...r })) : null,
        error: null,
      };
    }
    if (this.op === 'delete') {
      this.db.tables[this.name] = rows.filter((r) => !matched.includes(r));
      return { data: null, error: null };
    }
    const sorted = [...matched];
    for (const { col, asc } of [...this.orders].reverse()) {
      sorted.sort((a, b) => {
        const x = get(a, col);
        const y = get(b, col);
        if (x === y) return 0;
        return (x > y ? 1 : -1) * (asc ? 1 : -1);
      });
    }
    const limited =
      this.limitN === undefined ? sorted : sorted.slice(0, this.limitN);
    return {
      data: this.head ? null : limited.map((r) => ({ ...r })),
      error: null,
      count: this.wantCount ? matched.length : undefined,
    };
  }

  private runInsert(rows: Row[]) {
    const hooks = this.db.beforeInsert[this.name];
    if (hooks?.length) hooks.shift()?.();
    const inserted: Row[] = [];
    for (const input of Array.isArray(this.payload)
      ? this.payload
      : [this.payload]) {
      const row: Row = {
        id: randomUUID(),
        created_at: new Date().toISOString(),
        ...(this.options.defaults?.[this.name]?.() ?? {}),
        ...input,
      };
      for (const cols of this.options.uniques?.[this.name] ?? []) {
        const clash = rows.some((existing) =>
          cols.every((c) => row[c] != null && existing[c] === row[c]),
        );
        if (clash) {
          return {
            data: null,
            error: {
              code: '23505',
              message: `duplicate key value violates unique constraint "uq_${this.name}_${cols.join('_')}"`,
            },
          };
        }
      }
      rows.push(row);
      inserted.push(row);
    }
    return {
      data: this.returning ? inserted.map((r) => ({ ...r })) : null,
      error: null,
    };
  }

  maybeSingle() {
    const res = this.run();
    return Promise.resolve({
      ...res,
      data: Array.isArray(res.data) ? (res.data[0] ?? null) : res.data,
    });
  }
  single() {
    const res = this.run();
    const first = Array.isArray(res.data) ? res.data[0] : res.data;
    if (res.error) return Promise.resolve(res);
    return Promise.resolve(
      first
        ? { ...res, data: first }
        : { data: null, error: { code: 'PGRST116', message: 'no rows' } },
    );
  }
  then<T1 = any, T2 = never>(
    onfulfilled?: ((value: any) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: any) => T2 | PromiseLike<T2>) | null,
  ): PromiseLike<T1 | T2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

export const AUCTION_ID = '11111111-1111-4111-8111-111111111111';

export function liveAuctionRow(overrides: Row = {}): Row {
  return {
    id: AUCTION_ID,
    title: 'Spring Gala',
    description: 'Silent auction',
    status: 'live',
    starts_at: new Date(Date.now() - 3_600_000).toISOString(),
    ends_at: new Date(Date.now() + 3_600_000).toISOString(),
    org_name: 'Helping Hands',
    org_ein: '12-3456789',
    event_title: null,
    event_date: null,
    public_event_id: null,
    promoter_account_id: 'promoter-secret',
    created_by_user_id: 'user-secret',
    promoter_accounts: { is_nonprofit: true, nonprofit_status: 'verified' },
    ...overrides,
  };
}

/** Database with the unique indexes and column defaults the auction tables have. */
export function makeBiddingDb(
  tables: Record<string, Row[]> = {},
  rpc: FakeDbOptions['rpc'] = {},
): FakeDb {
  return new FakeDb(
    { auctions: [liveAuctionRow()], ...tables },
    {
      uniques: {
        auction_bidders: [
          ['auction_id', 'email'],
          ['auction_id', 'phone_e164'],
          ['auction_id', 'paddle_number'],
        ],
      },
      defaults: {
        auction_otps: () => ({ attempts: 0, consumed_at: null }),
        auction_bidders: () => ({
          token_version: 0,
          card_status: 'none',
          blocked_at: null,
          email_verified_at: null,
          phone_verified_at: null,
        }),
      },
      rpc,
    },
  );
}
