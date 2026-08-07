import { supabase } from '@/lib/supabase';

// Roles that get the OwnerSuite dashboard (owner-equivalent roles)
const OWNER_ROLES = ['owner', 'admin', 'venue_owner', 'concierge'];

export function getDashboardRoute(role: string): string {
  if (role === 'vendor') return '/(tabs)/vendor-dashboard';
  if (role === 'promoter') return '/(tabs)/promoter-dashboard';
  if (role === 'artist') return '/(tabs)/artist-dashboard';
  if (OWNER_ROLES.includes(role)) return '/(tabs)/dashboard';
  return '/(tabs)/';
}

export async function getUserRole(userId: string): Promise<string> {
  try {
    // Try users table first (requires RLS policy allowing self-read)
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .maybeSingle();
    if (!error && data?.role) return data.role;

    // Fallback: check user_metadata set at signup or by admin
    const { data: { user } } = await supabase.auth.getUser();
    const metaRole = user?.user_metadata?.role || user?.app_metadata?.role;
    if (metaRole) return metaRole;

    return 'attendee';
  } catch {
    return 'attendee';
  }
}

// Resolves the correct dashboard route for a session, checking
// user/app metadata first (no RLS needed) before falling back to a
// DB lookup. Shared by app/index.tsx (cold start) and app/_layout.tsx
// (auth state changes) so both paths always agree on where a signed-in
// user should land.
export async function resolveDashboardRouteForSession(session: {
  user: { id: string; user_metadata?: any; app_metadata?: any };
}): Promise<string> {
  const metaRole =
    session.user.user_metadata?.role || session.user.app_metadata?.role;
  const role = metaRole || (await getUserRole(session.user.id));
  return getDashboardRoute(role);
}
