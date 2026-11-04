import { NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Turns the name in a public intake link into the owner's primary_owner_id.
 * The name is the owner's intake slug, or a user id. A team member's id counts too: their dashboard builds
 * the link from their own id, so it must lead to the account they work for.
 */
export async function resolveOwnerIdentifier(
  admin: SupabaseClient,
  identifier: string,
): Promise<string> {
  if (!UUID.test(identifier)) {
    const { data } = await admin
      .from('owner_accounts')
      .select('primary_owner_id')
      .eq('intake_slug', identifier)
      .maybeSingle();
    if (!data?.primary_owner_id) throw new NotFoundException('Owner not found');
    return data.primary_owner_id as string;
  }

  const { data: owner } = await admin
    .from('owner_accounts')
    .select('primary_owner_id')
    .eq('primary_owner_id', identifier)
    .maybeSingle();
  if (owner?.primary_owner_id) return owner.primary_owner_id as string;

  const { data: membership } = await admin
    .from('memberships')
    .select('owner_account_id')
    .eq('user_id', identifier)
    .not('owner_account_id', 'is', null)
    .limit(1)
    .maybeSingle();
  if (membership?.owner_account_id != null) {
    const { data: account } = await admin
      .from('owner_accounts')
      .select('primary_owner_id')
      .eq('id', membership.owner_account_id)
      .maybeSingle();
    if (account?.primary_owner_id) return account.primary_owner_id as string;
  }
  throw new NotFoundException('Owner not found');
}
