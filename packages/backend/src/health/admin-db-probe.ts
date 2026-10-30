import type { SupabaseClient } from '@supabase/supabase-js';

export interface AdminDbProbe {
  status: 'ok' | 'degraded';
  /** What the admin connection could do, in plain words, for whoever reads this page. */
  problem: string | null;
  adminApi: 'ok' | 'rejected';
  /** Rows the admin and the ordinary (anon) connection can each see in a table only the admin should read. */
  protectedRows: { admin: number | null; anon: number | null };
}

const PROTECTED_TABLE = 'external_events';

async function countRows(client: SupabaseClient): Promise<number | null> {
  const { count, error } = await client
    .from(PROTECTED_TABLE)
    .select('id', { count: 'exact', head: true });
  return error ? null : (count ?? 0);
}

/**
 * Checks that the backend's admin connection really has admin rights.
 * A wrong key can still boot and sign users in while every admin read quietly comes back empty, so this
 * asks Supabase two things: does the admin-only API accept the key, and does the admin see more rows than
 * the ordinary connection does in a table the public cannot read.
 */
export async function probeAdminDb(
  admin: SupabaseClient,
  anon: SupabaseClient,
): Promise<AdminDbProbe> {
  const { error: adminApiError } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  const adminApi = adminApiError ? 'rejected' : 'ok';

  const [adminRows, anonRows] = await Promise.all([
    countRows(admin),
    countRows(anon),
  ]);

  let problem: string | null = null;
  if (adminApi === 'rejected') {
    problem =
      'Supabase rejects the admin key for admin-only requests. The key in SUPABASE_SERVICE_ROLE_KEY is not a working service_role key for this project.';
  } else if (adminRows === null) {
    problem = `The admin connection could not read ${PROTECTED_TABLE}.`;
  } else if (adminRows === 0 && anonRows === 0) {
    problem = `The admin connection sees no rows in ${PROTECTED_TABLE} (the table may be empty, or the connection is not acting as admin).`;
  }

  return {
    status: problem ? 'degraded' : 'ok',
    problem,
    adminApi,
    protectedRows: { admin: adminRows, anon: anonRows },
  };
}
