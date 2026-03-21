import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * JWT Authentication Guard
 * Validates the JWT token and attaches user info to the request
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
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

    // Get user with membership info to find owner_account_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        memberships(owner_account_id)
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new UnauthorizedException('User not found');
    }

    // Attach user and owner account ID to request
    request.user = userData;
    request.ownerAccountId = userData.memberships?.[0]?.owner_account_id || null;

    return true;
  }

  private extractToken(request: any): string | null {
    const authorization = request.headers.authorization;
    if (!authorization) return null;
    
    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
