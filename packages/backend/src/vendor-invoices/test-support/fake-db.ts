/**
 * A tiny in-memory stand-in for the Supabase admin client, just rich enough for the vendor
 * invoice and estimate services: select/insert/update/delete with eq/in/like/order/limit,
 * single/maybeSingle, and embedded relations declared in RELATIONS.
 */
type Row = Record<string, any>;

interface Relation {
  /** Column on the parent row that the relation joins on. */
  fk: string;
  many: boolean;
  /** For one-to-many: the column on the child rows that points back. */
  childFk?: string;
}

const RELATIONS: Record<string, Record<string, Relation>> = {
  vendor_estimates: {
    vendor_estimate_items: {
      fk: 'id',
      many: true,
      childFk: 'vendor_estimate_id',
    },
    vendor_accounts: { fk: 'vendor_account_id', many: false },
  },
  vendor_invoices: {
    vendor_invoice_items: {
      fk: 'id',
      many: true,
      childFk: 'vendor_invoice_id',
    },
    vendor_accounts: { fk: 'vendor_account_id', many: false },
  },
  vendor_invoice_items: {
    vendor_invoices: { fk: 'vendor_invoice_id', many: false },
  },
};

export class FakeDb {
  tables: Record<string, Row[]> = {};
  private seq = 0;

  constructor(seed: Record<string, Row[]> = {}) {
    for (const [name, rows] of Object.entries(seed)) {
      this.tables[name] = rows.map((r) => ({ ...r }));
    }
  }

  rows(table: string): Row[] {
    return (this.tables[table] ??= []);
  }

  from(table: string) {
    return new FakeQuery(this, table);
  }

  nextId() {
    return `id-${++this.seq}`;
  }

  attach(table: string, row: Row, select: string): Row {
    const out = { ...row };
    for (const [name, rel] of Object.entries(RELATIONS[table] ?? {})) {
      if (!new RegExp(`\\b${name}(!inner)?\\(`).test(select)) continue;
      if (rel.many) {
        out[name] = this.rows(name).filter(
          (c) => c[rel.childFk!] === row[rel.fk],
        );
      } else {
        out[name] = this.rows(name).find((p) => p.id === row[rel.fk]) ?? null;
      }
    }
    return out;
  }
}

class FakeQuery {
  private filters: Array<(r: Row) => boolean> = [];
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any;
  private selectCols = '*';
  private orderKey?: { key: string; asc: boolean };
  private limitN?: number;

  constructor(
    private db: FakeDb,
    private table: string,
  ) {}

  select(cols = '*') {
    this.selectCols = cols;
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
  eq(key: string, value: unknown) {
    this.filters.push((r) => r[key] === value);
    return this;
  }
  neq(key: string, value: unknown) {
    this.filters.push((r) => r[key] !== value);
    return this;
  }
  ilike(key: string, pattern: string) {
    const wanted = pattern.replace(/\\([%_])/g, '$1').toLowerCase();
    this.filters.push((r) => String(r[key] ?? '').toLowerCase() === wanted);
    return this;
  }
  not(key: string, op: string, value: unknown) {
    if (op === 'is') this.filters.push((r) => (r[key] ?? null) !== value);
    return this;
  }
  gt(key: string, value: number) {
    this.filters.push((r) => Number(r[key]) > value);
    return this;
  }
  is(key: string, value: null) {
    this.filters.push((r) => (r[key] ?? null) === value);
    return this;
  }
  in(key: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[key]));
    return this;
  }
  like(key: string, pattern: string) {
    const prefix = pattern.replace(/%$/, '');
    this.filters.push((r) => String(r[key] ?? '').startsWith(prefix));
    return this;
  }
  order(key: string, opts?: { ascending?: boolean }) {
    this.orderKey = { key, asc: opts?.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }

  private run(): { data: any; error: any } {
    const table = this.db.rows(this.table);
    const matches = () => table.filter((r) => this.filters.every((f) => f(r)));

    if (this.op === 'insert') {
      const list = Array.isArray(this.payload) ? this.payload : [this.payload];
      const created = list.map((p) => {
        const row = {
          id: this.db.nextId(),
          public_token: `tok-${this.db.nextId()}`,
          created_at: new Date().toISOString(),
          ...p,
        };
        table.push(row);
        return row;
      });
      return { data: created, error: null };
    }
    if (this.op === 'update') {
      const hit = matches();
      hit.forEach((r) => Object.assign(r, this.payload));
      return { data: hit.map((r) => ({ ...r })), error: null };
    }
    if (this.op === 'delete') {
      const hit = matches();
      this.db.tables[this.table] = table.filter((r) => !hit.includes(r));
      return { data: hit, error: null };
    }
    let rows = matches().map((r) =>
      this.db.attach(this.table, r, this.selectCols),
    );
    if (this.orderKey) {
      const { key, asc } = this.orderKey;
      rows.sort(
        (a, b) =>
          (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (asc ? 1 : -1),
      );
    }
    if (this.limitN !== undefined) rows = rows.slice(0, this.limitN);
    return { data: rows, error: null };
  }

  single() {
    const { data, error } = this.run();
    const row = Array.isArray(data) ? data[0] : data;
    return Promise.resolve(
      row
        ? { data: row, error }
        : { data: null, error: { code: 'PGRST116', message: 'no rows' } },
    );
  }
  maybeSingle() {
    const { data } = this.run();
    return Promise.resolve({
      data: (Array.isArray(data) ? data[0] : data) ?? null,
      error: null,
    });
  }
  then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
    return Promise.resolve(this.run()).then(resolve, reject);
  }
}
