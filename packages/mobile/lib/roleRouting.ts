import { supabase } from '@/lib/supabase';

// Maps a user's role to the route group they land on after login/auth-state
// change. This is the ONE place role → home-route mapping lives.
//
// When a role's dedicated route group (e.g. app/(vendor)/) is built, flip
// that role's entry below to point at it. Do not hardcode role lists or
// redirect targets in app/_layout.tsx directly — add/change a map entry here
// instead so parallel per-role work never needs to touch _layout.tsx.

export const ROLE_HOME: Record<string, string> = {
  owner: '/(tabs)/dashboard',
  admin: '/(tabs)/dashboard',
  venue_owner: '/(tabs)/dashboard',
  concierge: '/(tabs)/dashboard',
  vendor: '/(vendor)',
  artist: '/(artist)',
  promoter: '/(promoter)',
};

// There is no real "attendee" role in the backend (see ROLE_HOME above) —
// this is only reached when a role can't be resolved to a known one. Route
// to the real, live-data guest experience (app/(guest)/) rather than the
// old mock-data attendee tabs, which have been removed.
export const ATTENDEE_HOME = '/(guest)';

export function getRoleHomeRoute(role: string | null | undefined): string {
  if (role && ROLE_HOME[role]) return ROLE_HOME[role];
  return ATTENDEE_HOME;
}

// Races a promise against a timeout so a hung network/auth call can never
// leave the caller stuck awaiting forever (e.g. a stalled Supabase request
// on cold start would otherwise leave the app spinning on the loading
// screen indefinitely).
function withTimeout<T>(promise: PromiseLike<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) { settled = true; resolve(null); }
    }, ms);
    promise.then(
      (value) => { if (!settled) { settled = true; clearTimeout(timer); resolve(value); } },
      () => { if (!settled) { settled = true; clearTimeout(timer); resolve(null); } },
    );
  });
}

// Resolves the current user's role: DB `users.role` first (requires RLS
// policy allowing self-read), falling back to auth user_metadata/app_metadata,
// then finally 'attendee'. Shared by app/_layout.tsx and app/index.tsx so both
// land the user on the same route on cold start / auth-state changes.
export async function getUserRole(userId: string): Promise<string> {
  try {
    const result = await withTimeout(
      supabase.from('users').select('role').eq('id', userId).maybeSingle(),
      8000,
    );
    if (result && !result.error && result.data?.role) return result.data.role;

    const userResult = await withTimeout(supabase.auth.getUser(), 8000);
    const authUser = userResult?.data.user;
    const metaRole = authUser?.user_metadata?.role || authUser?.app_metadata?.role;
    if (metaRole) return metaRole;

    return 'attendee';
  } catch {
    return 'attendee';
  }
}

// Resolves the home route for an already-fetched session. Always defers to
// getUserRole's live DB lookup as the source of truth — do NOT read
// user.user_metadata/app_metadata here first. The session's JWT claims can
// be stale (they only refresh when the token itself is reissued), so if a
// role changes after the session was established, trusting the cached
// metadata first would route the user to the wrong (stale) dashboard.
export async function getSessionHomeRoute(user: {
  id: string;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}): Promise<string> {
  const role = await getUserRole(user.id);
  return getRoleHomeRoute(role);
}
