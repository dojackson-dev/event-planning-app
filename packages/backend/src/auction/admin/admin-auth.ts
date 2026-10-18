import { UnauthorizedException } from '@nestjs/common';
import {
  PromoterAccessPolicy,
  PromoterAccessService,
} from '../../promoter-team/promoter-access.service';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Bearer-token -> effective promoter user id, same flow as NonprofitController.
 * Team admins resolve to the account creator's id; staff are rejected for 'write'.
 */
export async function resolveAdminUserId(
  supabaseService: SupabaseService,
  access: PromoterAccessService,
  authorization: string | undefined,
  policy: PromoterAccessPolicy,
): Promise<string> {
  if (!authorization)
    throw new UnauthorizedException('No authorization header');
  const token = authorization.replace('Bearer ', '');
  if (token.startsWith('local-') && process.env.ALLOW_LOCAL_DEV_AUTH === 'true')
    return access.resolveUserId(token.replace('local-', ''), policy);
  const supabase = supabaseService.setAuthContext(token);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new UnauthorizedException('Invalid token');
  return access.resolveUserId(user.id, policy);
}
