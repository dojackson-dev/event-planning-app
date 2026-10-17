import { ForbiddenException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * How a promoter-facing route treats a team member:
 * - self:  never swap identity (non-promoter routes, artist-side routes)
 * - read:  admin and staff may call it
 * - scan:  admin and staff may call it (door scanning)
 * - write: admin only
 * - owner: account creator only (plan, Stripe, non-profit verification)
 */
export type PromoterAccessPolicy = 'self' | 'read' | 'scan' | 'write' | 'owner';

export type PromoterTeamRole = 'admin' | 'staff';

const ALLOWED_ROLES: Record<
  Exclude<PromoterAccessPolicy, 'self'>,
  PromoterTeamRole[]
> = {
  read: ['admin', 'staff'],
  scan: ['admin', 'staff'],
  write: ['admin'],
  owner: [],
};

@Injectable()
export class PromoterAccessService {
  constructor(private readonly supabaseService: SupabaseService) {}

  /**
   * Returns the user id whose promoter account the request should act on.
   * Creators (and anyone who is not a team member) get their own id back, so
   * existing services keep resolving the account via promoter_accounts.user_id.
   */
  async resolveUserId(
    userId: string,
    policy: PromoterAccessPolicy,
  ): Promise<string> {
    if (policy === 'self') return userId;

    const membership = await this.getMembership(userId);
    if (!membership) return userId;

    if (!ALLOWED_ROLES[policy].includes(membership.role)) {
      throw new ForbiddenException('Your team role does not allow this action');
    }
    return membership.creatorUserId;
  }

  /** Active team membership of a user, with the account creator's user id. */
  async getMembership(userId: string): Promise<{
    role: PromoterTeamRole;
    promoterAccountId: string;
    creatorUserId: string;
  } | null> {
    const admin = this.supabaseService.getAdminClient();
    const { data, error } = await admin
      .from('promoter_team_members')
      .select('role, promoter_account_id, account:promoter_accounts(user_id)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;
    const creatorUserId = (data.account as { user_id?: string } | null)
      ?.user_id;
    if (!creatorUserId) return null;

    return {
      role: data.role as PromoterTeamRole,
      promoterAccountId: data.promoter_account_id as string,
      creatorUserId,
    };
  }
}
