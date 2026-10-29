import { probeAdminDb } from './admin-db-probe';

function client(opts: { adminApiError?: boolean; rows?: number | null }) {
  return {
    auth: {
      admin: {
        listUsers: jest.fn().mockResolvedValue({
          error: opts.adminApiError ? { message: 'not allowed' } : null,
        }),
      },
    },
    from: () => ({
      select: () =>
        Promise.resolve(
          opts.rows === null
            ? { count: null, error: { message: 'denied' } }
            : { count: opts.rows ?? 0, error: null },
        ),
    }),
  } as any;
}

describe('probeAdminDb', () => {
  it('is ok when the admin key works and sees more than the ordinary connection', async () => {
    const result = await probeAdminDb(
      client({ rows: 82158 }),
      client({ rows: 0 }),
    );
    expect(result).toEqual({
      status: 'ok',
      problem: null,
      adminApi: 'ok',
      protectedRows: { admin: 82158, anon: 0 },
    });
  });

  it('flags a key that Supabase rejects for admin-only requests', async () => {
    const result = await probeAdminDb(
      client({ adminApiError: true, rows: 0 }),
      client({ rows: 0 }),
    );
    expect(result.status).toBe('degraded');
    expect(result.adminApi).toBe('rejected');
    expect(result.problem).toContain('not a working service_role key');
  });

  it('flags an admin connection that sees nothing in a table the public cannot read', async () => {
    const result = await probeAdminDb(client({ rows: 0 }), client({ rows: 0 }));
    expect(result.status).toBe('degraded');
    expect(result.problem).toContain('sees no rows');
  });

  it('flags an admin connection that cannot read the table at all', async () => {
    const result = await probeAdminDb(
      client({ rows: null }),
      client({ rows: 0 }),
    );
    expect(result.status).toBe('degraded');
    expect(result.protectedRows.admin).toBeNull();
  });
});
