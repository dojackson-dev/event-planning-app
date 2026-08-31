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

export const ATTENDEE_HOME = '/(tabs)/';

export function getRoleHomeRoute(role: string | null | undefined): string {
  if (role && ROLE_HOME[role]) return ROLE_HOME[role];
  return ATTENDEE_HOME;
}

// Resolves the current user's role: DB `users.role` first (requires RLS
// policy allowing self-read), falling back to auth user_metadata/app_metadata,
// then finally 'attendee'. Shared by app/_layout.tsx and app/index.tsx so both
// land the user on the same route on cold start / auth-state changes.
export async function getUserRole(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data?.role) return data.role;

    const { data: { user } } = await supabase.auth.getUser();
    const metaRole = user?.user_metadata?.role || user?.app_metadata?.role;
    if (metaRole) return metaRole;

    return 'attendee';
  } catch {
    return 'attendee';
  }
}

// Resolves the home route for an already-fetched session, checking
// user_metadata/app_metadata first (no RLS needed) before falling back to
// the DB lookup in getUserRole.
export async function getSessionHomeRoute(user: {
  id: string;
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}): Promise<string> {
  const metaRole = (user.user_metadata?.role || user.app_metadata?.role) as string | undefined;
  const role = metaRole || await getUserRole(user.id);
  return getRoleHomeRoute(role);
}
