/** Minimal chainable Supabase stand-in for unit tests: records calls and answers from registered handlers. */
export interface FakeCall {
  table: string;
  op: 'select' | 'insert' | 'update' | 'delete';
  payload?: unknown;
  filters: Array<[string, string, unknown]>;
  selectOpts?: { count?: string; head?: boolean };
}

export interface FakeResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

type Responder = FakeResult | ((call: FakeCall) => FakeResult);
type RpcResponder =
  | FakeResult
  | ((args: Record<string, unknown>) => FakeResult);

export class FakeDb {
  calls: FakeCall[] = [];
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];
  private responders = new Map<string, Responder>();
  private rpcResponders = new Map<string, RpcResponder>();

  /** Key is `${table}.${op}`. */
  on(key: string, responder: Responder): this {
    this.responders.set(key, responder);
    return this;
  }

  onRpc(fn: string, responder: RpcResponder): this {
    this.rpcResponders.set(fn, responder);
    return this;
  }

  rpcArgs(fn: string): Array<Record<string, unknown>> {
    return this.rpcCalls.filter((c) => c.fn === fn).map((c) => c.args);
  }

  ops(table: string, op: FakeCall['op']): FakeCall[] {
    return this.calls.filter((c) => c.table === table && c.op === op);
  }

  private answer(call: FakeCall): FakeResult {
    const responder = this.responders.get(`${call.table}.${call.op}`);
    const raw =
      typeof responder === 'function' ? responder(call) : (responder ?? {});
    return { data: null, error: null, count: 0, ...raw };
  }

  from(table: string) {
    const call: FakeCall = { table, op: 'select', filters: [] };
    const record = () => {
      this.calls.push(call);
    };
    let recorded = false;
    const settle = () => {
      if (!recorded) {
        record();
        recorded = true;
      }
      return this.answer(call);
    };
    const builder: Record<string, unknown> = {};
    const chain =
      (name: string) =>
      (...args: unknown[]) => {
        call.filters.push([name, String(args[0]), args[1]]);
        return builder;
      };
    for (const m of [
      'eq',
      'neq',
      'in',
      'is',
      'not',
      'lt',
      'lte',
      'gt',
      'gte',
      'order',
      'limit',
    ]) {
      builder[m] = chain(m);
    }
    builder.select = (_cols?: string, opts?: FakeCall['selectOpts']) => {
      if (opts) call.selectOpts = opts;
      return builder;
    };
    for (const op of ['insert', 'update', 'delete'] as const) {
      builder[op] = (payload?: unknown) => {
        call.op = op;
        call.payload = payload;
        return builder;
      };
    }
    const single = () => {
      const res = settle();
      const data = Array.isArray(res.data) ? (res.data[0] ?? null) : res.data;
      return Promise.resolve({ ...res, data });
    };
    builder.maybeSingle = single;
    builder.single = single;
    builder.then = (resolve: (v: unknown) => unknown) => resolve(settle());
    return builder;
  }

  rpc(fn: string, args: Record<string, unknown> = {}) {
    this.rpcCalls.push({ fn, args });
    const responder = this.rpcResponders.get(fn);
    const raw =
      typeof responder === 'function' ? responder(args) : (responder ?? {});
    return Promise.resolve({ data: null, error: null, ...raw });
  }

  client() {
    return {
      from: (t: string) => this.from(t),
      rpc: (fn: string, args?: Record<string, unknown>) => this.rpc(fn, args),
    };
  }
}
