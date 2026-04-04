import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Guard that validates a JWT token and ensures the user has the 'affiliate' role.
 * Attaches `request.affiliate` with the full affiliates row.
 */
@Injectable()
export class AffiliateGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    // Verify user has affiliate role in users table
    const admin = this.supabaseService.getAdminClient();
    const { data: userData } = await admin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || userData.role !== 'affiliate') {
      throw new UnauthorizedException('Affiliate access only');
    }

    // Load affiliate record
    const { data: affiliate } = await admin
      .from('affiliates')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!affiliate || affiliate.status === 'inactive') {
      throw new UnauthorizedException('Affiliate account not found or inactive');
    }

    request.user = { ...userData, id: user.id };
    request.affiliate = affiliate;
    return true;
  }

  private extractToken(request: any): string | null {
    const auth = request.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) return null;
    return auth.substring(7);
  }
}
