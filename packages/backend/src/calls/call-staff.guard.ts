import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ADMIN_EMAIL,
  CallIdentity,
  SALES_MANAGER_EMAIL,
} from './calls.service';

/**
 * Lets in the EventEcos admin and sales reps (affiliates) only, and attaches `request.callStaff`.
 * Whether a person may actually place calls is a separate, admin-controlled switch checked in the service.
 */
@Injectable()
export class CallStaffGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }
    const admin = this.supabase.getAdminClient();
    const {
      data: { user },
      error,
    } = await admin.auth.getUser(header.substring(7));
    if (error || !user) throw new UnauthorizedException('Invalid token');

    const email = (user.email ?? '').toLowerCase();
    if (email === ADMIN_EMAIL) {
      const identity: CallIdentity = {
        userId: user.id,
        email,
        kind: 'admin',
        name: 'EventEcos Admin',
        isManager: true,
      };
      request.callStaff = identity;
      return true;
    }

    const { data: userRow } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if ((userRow as { role?: string } | null)?.role !== 'affiliate') {
      throw new UnauthorizedException('Staff access only');
    }
    const { data: affiliate } = await admin
      .from('affiliates')
      .select('id, first_name, last_name, email, status')
      .eq('user_id', user.id)
      .maybeSingle();
    const a = affiliate as {
      id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      status: string;
    } | null;
    if (!a || a.status === 'inactive') {
      throw new UnauthorizedException('Staff account not found or inactive');
    }
    const identity: CallIdentity = {
      userId: user.id,
      email,
      kind: 'sales',
      name: [a.first_name, a.last_name].filter(Boolean).join(' ') || email,
      affiliateId: a.id,
      isManager: email === SALES_MANAGER_EMAIL,
    };
    request.callStaff = identity;
    return true;
  }
}
