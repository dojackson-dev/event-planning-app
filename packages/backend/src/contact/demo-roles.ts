export const DEMO_ROLES: Record<string, string> = {
  venue_owner: 'Venue Owner',
  promoter: 'Promoter',
  artist: 'Artist',
  vendor: 'Vendor',
};

export function demoRoleLabels(keys: string[] | null | undefined): string[] {
  return (keys ?? []).map((key) =>
    Object.prototype.hasOwnProperty.call(DEMO_ROLES, key)
      ? DEMO_ROLES[key]
      : key,
  );
}
