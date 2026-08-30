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
