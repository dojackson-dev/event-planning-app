import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

/**
 * Route guard to check subscription status for owner routes
 * Currently allows all active owners (Phase 2 will add Stripe gating)
 */
@Injectable()
export class SubscriptionGuard implements CanActivate {
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

    // Get user with membership and subscription info
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        *,
        memberships!inner(
          owner_account_id,
          owner_accounts!inner(subscription_status)
        )
      `)
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      throw new UnauthorizedException('User not found');
    }

    // Check if owner
    if (userData.role !== 'owner') {
      throw new UnauthorizedException('Not an owner account');
    }

    // Phase 2: Enable this check for Stripe gating
    // const subscriptionStatus = userData.memberships[0]?.owner_accounts?.subscription_status;
    // if (!['trialing', 'active'].includes(subscriptionStatus)) {
    //   throw new UnauthorizedException('Subscription required');
    // }

    request.user = userData;
    return true;
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}

/**
 * Role-based guard
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
  ) {}

  private requiredRoles: string[] = [];

  setRequiredRoles(roles: string[]): this {
    this.requiredRoles = roles;
    return this;
  }

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

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (this.requiredRoles.length > 0 && (!userData || !this.requiredRoles.includes(userData.role))) {
      throw new UnauthorizedException(`Required role: ${this.requiredRoles.join(' or ')}`);
    }

    request.user = userData;
    return true;
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }
}
