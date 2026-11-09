type Admin = { from: (table: string) => any };
type StripeLike = {
  accounts: {
    retrieve: (id: string) => Promise<{
      details_submitted?: boolean;
      charges_enabled?: boolean;
      payouts_enabled?: boolean;
    }>;
  };
};

/**
 * The Stripe Connect account of the venue that this person owns, when it is fully set up.
 * Only the owner counts: a team member must never be handed the venue's payout account.
 */
export async function findOwnersActiveConnect(
  admin: Admin,
  stripe: StripeLike,
  userId: string,
): Promise<string | null> {
  let owner: {
    stripe_connect_id?: string | null;
    stripe_connect_status?: string | null;
  } | null = null;

  const { data: primary } = await admin
    .from('owner_accounts')
    .select('stripe_connect_id, stripe_connect_status')
    .eq('primary_owner_id', userId)
    .maybeSingle();
  owner = primary ?? null;

  if (!owner) {
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', userId)
      .eq('role', 'owner')
      .maybeSingle();
    if (membership?.owner_account_id) {
      const { data } = await admin
        .from('owner_accounts')
        .select('stripe_connect_id, stripe_connect_status')
        .eq('id', membership.owner_account_id)
        .maybeSingle();
      owner = data ?? null;
    }
  }

  const connectId = owner?.stripe_connect_id;
  if (!connectId || owner?.stripe_connect_status !== 'active') return null;

  try {
    const account = await stripe.accounts.retrieve(connectId);
    if (
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled
    ) {
      return connectId;
    }
  } catch {
    // If Stripe cannot confirm it, fall back to asking them to connect.
  }
  return null;
}
